const BannedWord = require('../models/BannedWord');
const ExcludedBannedWord = require('../models/ExcludedBannedWord');

const DEFAULT_BANNED_WORDS_URL = 'https://www.cs.cmu.edu/~biglou/resources/bad-words.txt';

/**
 * Fetch banned words from external URL
 */
async function fetchBannedWordsFromUrl(url = DEFAULT_BANNED_WORDS_URL) {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch banned words: ${response.statusText}`);
        }
        
        const text = await response.text();
        const words = text
            .split('\n')
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length > 0);
        
        return words;
    } catch (error) {
        console.error('Error fetching banned words:', error);
        return [];
    }
}

/**
 * Initialize banned words in database (only if empty)
 */
async function initializeBannedWords() {
    try {
        // Check if we already have banned words
        const existingCount = await BannedWord.countDocuments({});
        
        if (existingCount > 0) {
            console.log(`Banned words already initialized (${existingCount} words)`);
            return;
        }
        
        // Fetch from external source
        const words = await fetchBannedWordsFromUrl();
        
        if (words.length === 0) {
            console.warn('No banned words fetched from external source');
            return;
        }
        
        // We'll add these as "global" banned words with a placeholder guild ID
        // They'll be checked for all guilds
        const bannedWordDocs = words.map(word => ({
            guildId: 'global',
            word: word,
            addedBy: 'system'
        }));
        
        // Use insertMany with ordered: false to skip duplicates
        await BannedWord.insertMany(bannedWordDocs, { ordered: false }).catch(() => {});
        
        console.log(`Initialized ${words.length} banned words from external source`);
    } catch (error) {
        console.error('Error initializing banned words:', error);
    }
}

/**
 * Check if a message contains banned words
 */
async function containsBannedWord(message, guildId) {
    const content = message.toLowerCase();
    
    // Get excluded words for this guild
    const excludedWords = await ExcludedBannedWord.find({ guildId });
    const excludedSet = new Set(excludedWords.map(e => e.word));
    
    // Get all banned words (global + guild-specific)
    const bannedWords = await BannedWord.find({
        $or: [
            { guildId: 'global' },
            { guildId: guildId }
        ]
    });
    
    for (const { word, guildId: wordGuildId } of bannedWords) {
        // Skip if this global word is excluded for this guild
        if (wordGuildId === 'global' && excludedSet.has(word)) {
            continue;
        }
        
        // Check for word boundaries to avoid false positives
        const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
        if (regex.test(content)) {
            return { found: true, word };
        }
    }
    
    return { found: false, word: null };
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Add a banned word for a guild
 */
async function addBannedWord(guildId, word, addedBy) {
    const normalizedWord = word.toLowerCase().trim();
    
    try {
        const bannedWord = new BannedWord({
            guildId,
            word: normalizedWord,
            addedBy
        });
        
        await bannedWord.save();
        return { success: true, word: normalizedWord };
    } catch (error) {
        if (error.code === 11000) {
            return { success: false, error: 'Word already banned' };
        }
        throw error;
    }
}

/**
 * Remove a banned word from a guild (or exclude a global word)
 */
async function removeBannedWord(guildId, word, excludedBy = 'system') {
    const normalizedWord = word.toLowerCase().trim();
    
    // First try to delete guild-specific word
    const result = await BannedWord.findOneAndDelete({
        guildId,
        word: normalizedWord
    });
    
    if (result) {
        return { success: true, word: normalizedWord, type: 'deleted' };
    }
    
    // Check if it's a global word
    const globalWord = await BannedWord.findOne({
        guildId: 'global',
        word: normalizedWord
    });
    
    if (globalWord) {
        // Check if already excluded
        const existingExclusion = await ExcludedBannedWord.findOne({
            guildId,
            word: normalizedWord
        });
        
        if (existingExclusion) {
            return { success: false, error: 'Word already excluded for this server' };
        }
        
        // Add to exclusions for this guild
        const exclusion = new ExcludedBannedWord({
            guildId,
            word: normalizedWord,
            excludedBy
        });
        
        await exclusion.save();
        return { success: true, word: normalizedWord, type: 'excluded' };
    }
    
    return { success: false, word: normalizedWord };
}

/**
 * Re-enable a previously excluded global word for a guild
 */
async function reEnableBannedWord(guildId, word) {
    const normalizedWord = word.toLowerCase().trim();
    
    const result = await ExcludedBannedWord.findOneAndDelete({
        guildId,
        word: normalizedWord
    });
    
    return { success: !!result, word: normalizedWord };
}

/**
 * Get all banned words for a guild
 */
async function getBannedWords(guildId, includeGlobal = true) {
    const query = includeGlobal
        ? { $or: [{ guildId: 'global' }, { guildId }] }
        : { guildId };
    
    return BannedWord.find(query).sort({ word: 1 });
}

/**
 * Get excluded global words for a guild
 */
async function getExcludedWords(guildId) {
    return ExcludedBannedWord.find({ guildId }).sort({ word: 1 });
}

/**
 * Get effective banned words for a guild (global minus excluded + guild-specific)
 */
async function getEffectiveBannedWords(guildId) {
    const excludedWords = await ExcludedBannedWord.find({ guildId });
    const excludedSet = new Set(excludedWords.map(e => e.word));
    
    const allWords = await BannedWord.find({
        $or: [
            { guildId: 'global' },
            { guildId: guildId }
        ]
    }).sort({ word: 1 });
    
    // Filter out excluded global words
    return allWords.filter(w => {
        if (w.guildId === 'global' && excludedSet.has(w.word)) {
            return false;
        }
        return true;
    });
}

module.exports = {
    initializeBannedWords,
    containsBannedWord,
    addBannedWord,
    removeBannedWord,
    reEnableBannedWord,
    getBannedWords,
    getExcludedWords,
    getEffectiveBannedWords,
    fetchBannedWordsFromUrl
};
