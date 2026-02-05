const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    odorId: {
        type: String,
        required: true,
        unique: true
    },
    guildId: {
        type: String,
        required: true
    },
    // XP & Leveling
    xp: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 0
    },
    totalXp: {
        type: Number,
        default: 0
    },
    lastXpGain: {
        type: Date,
        default: null
    },
    // Daily Game
    lastDailyGame: {
        type: Date,
        default: null
    },
    dailyGamesPlayed: {
        type: Number,
        default: 0
    },
    // AI Interaction
    lastAiInteraction: {
        type: Date,
        default: null
    },
    aiInteractionCount: {
        type: Number,
        default: 0
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for faster queries
userSchema.index({ odorId: 1, guildId: 1 }, { unique: true });

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('User', userSchema);
