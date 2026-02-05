const mongoose = require('mongoose');

const excludedBannedWordSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    word: {
        type: String,
        required: true,
        lowercase: true
    },
    excludedBy: {
        type: String,
        default: 'system'
    },
    excludedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for unique exclusions per guild
excludedBannedWordSchema.index({ guildId: 1, word: 1 }, { unique: true });

module.exports = mongoose.model('ExcludedBannedWord', excludedBannedWordSchema);
