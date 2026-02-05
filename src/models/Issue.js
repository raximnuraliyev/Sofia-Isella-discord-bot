const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    odorId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true,
        maxLength: 100
    },
    description: {
        type: String,
        required: true,
        maxLength: 1000
    },
    status: {
        type: String,
        enum: ['open', 'in-progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    modNotes: {
        type: String,
        default: null
    },
    resolvedBy: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

issueSchema.index({ guildId: 1, status: 1 });
issueSchema.index({ guildId: 1, odorId: 1 });

module.exports = mongoose.model('Issue', issueSchema);
