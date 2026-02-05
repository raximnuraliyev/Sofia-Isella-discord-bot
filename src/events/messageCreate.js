const { Events, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { getGuildSettings, levelRolesToObject } = require('../utils/guildSettings');
const { containsBannedWord } = require('../utils/bannedWordsInit');
const { generateAIResponse } = require('../utils/aiUtils');
const { 
    randomXp, 
    levelFromTotalXp, 
    xpProgress, 
    createProgressBar,
    getAllAchievedMilestones 
} = require('../utils/levelUtils');
const config = require('../config/config');

// Cooldown maps
const xpCooldowns = new Map();
const aiCooldowns = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;
        
        try {
            // Check for banned words
            const bannedCheck = await containsBannedWord(message.content, message.guild.id);
            if (bannedCheck.found) {
                await handleBannedWord(message, bannedCheck.word);
                return;
            }
            
            // Process XP gain
            await processXP(message);
            
            // Check for AI trigger (mention or reply)
            if (shouldTriggerAI(message, client)) {
                await processAIResponse(message, client);
            }
        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    }
};

/**
 * Handle banned word detection
 */
async function handleBannedWord(message, word) {
    try {
        await message.delete();
        
        const settings = await getGuildSettings(message.guild.id);
        
        // Send warning to user
        await message.author.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Message Removed')
                    .setDescription('Your message was removed because it contained prohibited content. Please review the server rules.')
                    .setTimestamp()
            ]
        }).catch(() => {}); // Ignore if DMs are closed
        
        // Log incident if log channel is set
        if (settings.logChannelId) {
            const logChannel = message.guild.channels.cache.get(settings.logChannelId);
            if (logChannel) {
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setTitle('Banned Word Detected')
                            .addFields(
                                { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                                { name: 'Word', value: `||${word}||`, inline: true }
                            )
                            .setTimestamp()
                    ]
                });
            }
        }
    } catch (error) {
        console.error('Error handling banned word:', error);
    }
}

/**
 * Process XP gain from message
 */
async function processXP(message) {
    const settings = await getGuildSettings(message.guild.id);
    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    
    // Check cooldown
    if (xpCooldowns.has(cooldownKey)) {
        const lastGain = xpCooldowns.get(cooldownKey);
        if (Date.now() - lastGain < settings.xpSettings.cooldown) {
            return;
        }
    }
    
    // Calculate XP
    let xpGained = randomXp(settings.xpSettings.messageXPMin, settings.xpSettings.messageXPMax);
    
    // Bonus XP for attachments
    if (message.attachments.size > 0) {
        xpGained += randomXp(settings.xpSettings.attachmentXPMin, settings.xpSettings.attachmentXPMax);
    }
    
    // Get or create user
    let user = await User.findOne({ odorId: message.author.id, guildId: message.guild.id });
    
    if (!user) {
        user = new User({
            odorId: message.author.id,
            guildId: message.guild.id
        });
    }
    
    const oldLevel = user.level;
    user.totalXp += xpGained;
    user.lastXpGain = new Date();
    
    // Calculate new level
    const newLevel = levelFromTotalXp(user.totalXp);
    user.level = newLevel;
    
    // Calculate current XP for display
    const progress = xpProgress(user.totalXp);
    user.xp = progress.current;
    
    await user.save();
    
    // Update cooldown
    xpCooldowns.set(cooldownKey, Date.now());
    
    // Check for level up
    if (newLevel > oldLevel) {
        await handleLevelUp(message, user, oldLevel, newLevel, settings);
    }
}

/**
 * Handle level up event
 */
async function handleLevelUp(message, user, oldLevel, newLevel, settings) {
    const member = message.member;
    const levelRoles = levelRolesToObject(settings.levelRoles);
    
    // Get all achieved milestones
    const achievedMilestones = getAllAchievedMilestones(newLevel, levelRoles);
    const newMilestones = achievedMilestones.filter(m => m.level > oldLevel && m.level <= newLevel);
    
    // Assign new milestone roles
    for (const milestone of newMilestones) {
        const role = message.guild.roles.cache.get(milestone.roleId);
        if (role && !member.roles.cache.has(milestone.roleId)) {
            try {
                await member.roles.add(role);
            } catch (error) {
                console.error(`Failed to add role ${milestone.roleId}:`, error);
            }
        }
    }
    
    // Send level up message
    const progress = xpProgress(user.totalXp);
    const progressBar = createProgressBar(progress.percentage);
    
    const embed = new EmbedBuilder()
        .setColor(config.colors.levelUp)
        .setTitle('Level Up')
        .setDescription(`Congratulations ${message.author}, you have reached **Level ${newLevel}**`)
        .addFields(
            { name: 'Progress to Next Level', value: `${progressBar} ${progress.percentage}%`, inline: false }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
    
    // Add milestone info if achieved
    if (newMilestones.length > 0) {
        const roleNames = newMilestones
            .map(m => message.guild.roles.cache.get(m.roleId)?.name || `Level ${m.level}`)
            .join(', ');
        embed.addFields({ name: 'New Role Unlocked', value: roleNames, inline: false });
    }
    
    await message.channel.send({ embeds: [embed] });
}

/**
 * Check if AI should respond
 */
function shouldTriggerAI(message, client) {
    // Check if bot is mentioned
    if (message.mentions.has(client.user)) return true;
    
    // Check if replying to bot's message
    if (message.reference) {
        const repliedMessage = message.channel.messages.cache.get(message.reference.messageId);
        if (repliedMessage && repliedMessage.author.id === client.user.id) {
            return true;
        }
    }
    
    return false;
}

/**
 * Process AI response
 */
async function processAIResponse(message, client) {
    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    
    // Check cooldown
    if (aiCooldowns.has(cooldownKey)) {
        const lastInteraction = aiCooldowns.get(cooldownKey);
        if (Date.now() - lastInteraction < config.ai.cooldown) {
            return; // Silently ignore - don't spam with cooldown messages
        }
    }
    
    // Update cooldown
    aiCooldowns.set(cooldownKey, Date.now());
    
    // Show typing indicator
    await message.channel.sendTyping();
    
    // Clean the message content (remove bot mention)
    const cleanContent = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();
    
    if (!cleanContent) {
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setDescription("You called? I'm here... what's on your mind?")
            ]
        });
        return;
    }
    
    // Generate AI response
    const response = await generateAIResponse(cleanContent);
    
    // Update user AI interaction stats
    await User.findOneAndUpdate(
        { odorId: message.author.id, guildId: message.guild.id },
        { 
            $inc: { aiInteractionCount: 1 },
            $set: { lastAiInteraction: new Date() }
        },
        { upsert: true }
    );
    
    // Send response
    await message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.primary)
                .setDescription(response.content)
        ]
    });
}
