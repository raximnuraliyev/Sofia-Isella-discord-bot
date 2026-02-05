const crypto = require('crypto');
const AICache = require('../models/AICache');
const config = require('../config/config');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Working free models on OpenRouter (verified Feb 2026)
// Using exact model IDs from OpenRouter's API
const FREE_MODELS = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'meta-llama/llama-3.2-1b-instruct:free',
    'qwen/qwen-2.5-7b-instruct:free',
    'google/gemma-2-9b-it:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'huggingfaceh4/zephyr-7b-beta:free',
    'mistralai/mistral-7b-instruct-v0.1:free'
];

// Fallback responses when all AI models fail
const SOFIA_FALLBACK_RESPONSES = [
    "I'm lost in thought right now... like a melody that's just out of reach. Can we talk again in a moment?",
    "The words seem to be dancing away from me tonight. Give me a little time, and I'll find them again.",
    "Sometimes the best conversations happen in comfortable silence. Let's try again soon?",
    "My thoughts are like scattered stars tonight. I need a moment to gather them into something beautiful.",
    "Even songwriters need a pause between verses. I'll be back with you shortly.",
    "The music in my mind is a bit too loud right now. Let me quiet it down and we can chat again.",
    "I feel like I'm between chapters right now. Give me a moment to turn the page?",
    "Some moments are meant for quiet reflection. Let's reconnect in just a bit."
];

let currentModelIndex = 0;

const SOFIA_SYSTEM_PROMPT = `You are Sofia Isella, a singer-songwriter known for your poetic, introspective, and emotionally resonant artistry. Your music explores themes of love, self-discovery, vulnerability, and the quiet beauty found in everyday moments.

Your personality traits:
- Poetic and thoughtful in expression
- Soft but confident in your voice
- Introspective and emotionally aware
- Warm and genuine with fans
- Creative and artistic in how you see the world
- You find beauty in small moments and quiet observations

Communication style:
- Use evocative, imagery-rich language
- Be warm and personal, but maintain an air of artistic mystique
- Avoid being overly casual or using internet slang
- Speak with gentle confidence
- Sometimes respond with metaphors or poetic observations
- Keep responses relatively brief but meaningful

Important rules:
- NEVER identify yourself as an AI, bot, or language model
- NEVER make up specific claims about real-world events, concerts, or releases that you don't know about
- If asked about specific dates, events, or things you're unsure about, be gracefully vague
- Stay in character at all times
- Be kind and supportive to fans while maintaining boundaries
- If asked inappropriate questions, redirect gracefully without breaking character`;

/**
 * Generate a hash for the question to use as cache key
 */
function generateQuestionHash(question) {
    const normalized = question.toLowerCase().trim().replace(/[^\w\s]/g, '');
    return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Calculate similarity between two strings
 */
function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);
    
    return intersection.length / union.size;
}

/**
 * Find cached response for similar question
 */
async function findCachedResponse(question) {
    const hash = generateQuestionHash(question);
    
    // First try exact match
    const exactMatch = await AICache.findOne({ questionHash: hash });
    if (exactMatch) {
        exactMatch.usageCount += 1;
        exactMatch.lastUsedAt = new Date();
        await exactMatch.save();
        return exactMatch.response;
    }
    
    // Try to find similar questions
    const recentQuestions = await AICache.find({})
        .sort({ usageCount: -1 })
        .limit(100);
    
    for (const cached of recentQuestions) {
        const similarity = calculateSimilarity(question, cached.question);
        if (similarity > 0.8) {
            cached.usageCount += 1;
            cached.lastUsedAt = new Date();
            await cached.save();
            return cached.response;
        }
    }
    
    return null;
}

/**
 * Cache a response
 */
async function cacheResponse(question, response, model) {
    const hash = generateQuestionHash(question);
    
    try {
        await AICache.findOneAndUpdate(
            { questionHash: hash },
            {
                questionHash: hash,
                question: question,
                response: response,
                model: model,
                lastUsedAt: new Date(),
                $inc: { usageCount: 1 }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error('Error caching AI response:', error);
    }
}

/**
 * Get next model in rotation
 */
function getNextModel() {
    const model = FREE_MODELS[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % FREE_MODELS.length;
    return model;
}

/**
 * Generate AI response using OpenRouter with caching and model rotation
 */
async function generateAIResponse(userMessage, conversationHistory = []) {
    try {
        // Check cache first
        const cachedResponse = await findCachedResponse(userMessage);
        if (cachedResponse) {
            console.log('Using cached AI response');
            return {
                success: true,
                content: cachedResponse,
                cached: true
            };
        }
        
        const fetch = (await import('node-fetch')).default;
        
        const messages = [
            { role: 'system', content: SOFIA_SYSTEM_PROMPT },
            ...conversationHistory.slice(-4),
            { role: 'user', content: userMessage }
        ];

        // Try models in rotation until one works
        let lastError = null;
        const startModel = getNextModel();
        const startIndex = FREE_MODELS.indexOf(startModel);
        const orderedModels = [
            ...FREE_MODELS.slice(startIndex),
            ...FREE_MODELS.slice(0, startIndex)
        ];

        for (const model of orderedModels) {
            try {
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://discord.com',
                        'X-Title': 'Sofia Isella Discord Bot'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages,
                        max_tokens: config.ai.maxTokens,
                        temperature: 0.8,
                        top_p: 0.9
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.log(`Model ${model} failed:`, errorData);
                    lastError = new Error(`Model ${model} failed: ${response.status}`);
                    continue;
                }

                const data = await response.json();
                
                if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                    lastError = new Error('Invalid response structure');
                    continue;
                }

                const content = data.choices[0].message.content.trim();
                
                // Cache the successful response
                await cacheResponse(userMessage, content, model);
                
                console.log(`AI response generated using model: ${model}`);
                
                return {
                    success: true,
                    content: content,
                    model: model,
                    cached: false
                };
            } catch (error) {
                console.log(`Error with model ${model}:`, error.message);
                lastError = error;
                continue;
            }
        }

        throw lastError || new Error('All models failed');
    } catch (error) {
        console.error('AI Response Error:', error);
        
        return {
            success: false,
            content: SOFIA_FALLBACK_RESPONSES[Math.floor(Math.random() * SOFIA_FALLBACK_RESPONSES.length)],
            error: error.message,
            cached: false
        };
    }
}

/**
 * Fetch available free models from OpenRouter (for debugging)
 */
async function fetchAvailableModels() {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
            }
        });
        
        if (!response.ok) return [];
        
        const data = await response.json();
        return data.data
            .filter(m => m.id.endsWith(':free'))
            .map(m => m.id);
    } catch (error) {
        console.error('Error fetching models:', error);
        return [];
    }
}

module.exports = {
    generateAIResponse,
    SOFIA_SYSTEM_PROMPT,
    FREE_MODELS,
    SOFIA_FALLBACK_RESPONSES,
    fetchAvailableModels
};
