const GuildSettings = require('../models/GuildSettings');

// Cache for guild settings
const settingsCache = new Map();

/**
 * Get guild settings from database or cache
 */
async function getGuildSettings(guildId) {
    // Check cache first
    if (settingsCache.has(guildId)) {
        return settingsCache.get(guildId);
    }
    
    // Fetch from database
    let settings = await GuildSettings.findOne({ guildId });
    
    // Create default settings if none exist
    if (!settings) {
        settings = new GuildSettings({ guildId });
        await settings.save();
    }
    
    // Cache and return
    settingsCache.set(guildId, settings);
    return settings;
}

/**
 * Update guild settings
 */
async function updateGuildSettings(guildId, updates) {
    const settings = await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: updates },
        { new: true, upsert: true }
    );
    
    // Update cache
    settingsCache.set(guildId, settings);
    return settings;
}

/**
 * Clear settings cache for a guild
 */
function clearSettingsCache(guildId) {
    if (guildId) {
        settingsCache.delete(guildId);
    } else {
        settingsCache.clear();
    }
}

/**
 * Check if user has moderator permissions
 */
async function isModerator(member) {
    if (member.permissions.has('ModerateMembers')) return true;
    if (member.permissions.has('Administrator')) return true;
    
    const settings = await getGuildSettings(member.guild.id);
    
    if (settings.moderatorRoleId && member.roles.cache.has(settings.moderatorRoleId)) {
        return true;
    }
    
    if (settings.adminRoleId && member.roles.cache.has(settings.adminRoleId)) {
        return true;
    }
    
    return false;
}

/**
 * Check if user has admin permissions
 */
async function isAdmin(member) {
    if (member.permissions.has('Administrator')) return true;
    
    const settings = await getGuildSettings(member.guild.id);
    
    if (settings.adminRoleId && member.roles.cache.has(settings.adminRoleId)) {
        return true;
    }
    
    return false;
}

/**
 * Check if user is a server booster
 */
async function isBooster(member) {
    const settings = await getGuildSettings(member.guild.id);
    return member.roles.cache.has(settings.serverBoosterRoleId);
}

/**
 * Convert Map to Object for level roles
 */
function levelRolesToObject(levelRolesMap) {
    if (levelRolesMap instanceof Map) {
        return Object.fromEntries(levelRolesMap);
    }
    return levelRolesMap;
}

module.exports = {
    getGuildSettings,
    updateGuildSettings,
    clearSettingsCache,
    isModerator,
    isAdmin,
    isBooster,
    levelRolesToObject
};
