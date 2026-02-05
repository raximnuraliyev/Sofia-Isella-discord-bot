const mongoose = require('mongoose');

const aiCacheSchema = new mongoose.Schema({
    questionHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    question: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    usageCount: {
        type: Number,
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUsedAt: {
        type: Date,
        default: Date.now
    }
});

// TTL index - cache expires after 30 days of not being used
aiCacheSchema.index({ lastUsedAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('AICache', aiCacheSchema);
