const config = require('../config/config');

/**
 * Calculate XP required for a specific level
 * Formula: 5 * (level^2) + 50 * level + 100
 */
function xpForLevel(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

/**
 * Calculate total XP required to reach a specific level from level 0
 */
function totalXpForLevel(level) {
    let total = 0;
    for (let i = 1; i <= level; i++) {
        total += xpForLevel(i);
    }
    return total;
}

/**
 * Calculate level from total XP
 */
function levelFromTotalXp(totalXp) {
    let level = 0;
    let xpRequired = 0;
    
    while (level < config.xp.maxLevel) {
        xpRequired += xpForLevel(level + 1);
        if (totalXp < xpRequired) break;
        level++;
    }
    
    return Math.min(level, config.xp.maxLevel);
}

/**
 * Calculate XP progress within current level
 */
function xpProgress(totalXp) {
    const level = levelFromTotalXp(totalXp);
    const xpForCurrentLevel = totalXpForLevel(level);
    const xpForNextLevel = xpForLevel(level + 1);
    const currentXp = totalXp - xpForCurrentLevel;
    
    return {
        current: currentXp,
        required: xpForNextLevel,
        percentage: Math.floor((currentXp / xpForNextLevel) * 100)
    };
}

/**
 * Generate random XP within a range
 */
function randomXp(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a visual progress bar
 */
function createProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Get role milestone for a level
 */
function getRoleMilestone(level, levelRoles) {
    const milestones = Object.keys(levelRoles).map(Number).sort((a, b) => b - a);
    for (const milestone of milestones) {
        if (level >= milestone) {
            return { level: milestone, roleId: levelRoles[milestone] };
        }
    }
    return null;
}

/**
 * Get all role milestones achieved at a level
 */
function getAllAchievedMilestones(level, levelRoles) {
    return Object.entries(levelRoles)
        .filter(([milestone]) => level >= parseInt(milestone))
        .map(([milestone, roleId]) => ({ level: parseInt(milestone), roleId }));
}

module.exports = {
    xpForLevel,
    totalXpForLevel,
    levelFromTotalXp,
    xpProgress,
    randomXp,
    createProgressBar,
    getRoleMilestone,
    getAllAchievedMilestones
};
