const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
    odorId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    moderatorId: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

warningSchema.index({ odorId: 1, guildId: 1 });

module.exports = mongoose.model('Warning', warningSchema);
