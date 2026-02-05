const mongoose = require('mongoose');

const bannedWordSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    word: {
        type: String,
        required: true,
        lowercase: true
    },
    addedBy: {
        type: String,
        default: 'system'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for unique words per guild
bannedWordSchema.index({ guildId: 1, word: 1 }, { unique: true });

module.exports = mongoose.model('BannedWord', bannedWordSchema);
