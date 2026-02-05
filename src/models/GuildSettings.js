const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    // Welcome Settings
    welcomeChannelId: {
        type: String,
        default: '1376656024852758651'
    },
    welcomeMessage: {
        type: String,
        default: 'Welcome to the Sofia Isella community, {user}. We are so glad you found your way here. May your time with us be filled with warmth, wonder, and a little bit of magic.'
    },
    welcomeEnabled: {
        type: Boolean,
        default: true
    },
    welcomeImageUrl: {
        type: String,
        default: 'https://i.pinimg.com/736x/2e/4f/8c/2e4f8c9b3e7a1d5c4b2a8f6e3d9c7b1a.jpg'
    },
    // Channel References for Welcome
    rulesChannelId: {
        type: String,
        default: '1376661327568699422'
    },
    rolesChannelId: {
        type: String,
        default: '1376661554652516352'
    },
    introChannelId: {
        type: String,
        default: '1376661806885638185'
    },
    mainChannelId: {
        type: String,
        default: null
    },
    // XP Settings
    xpSettings: {
        messageXPMin: { type: Number, default: 15 },
        messageXPMax: { type: Number, default: 25 },
        attachmentXPMin: { type: Number, default: 20 },
        attachmentXPMax: { type: Number, default: 35 },
        cooldown: { type: Number, default: 60000 }
    },
    // Level Roles (stored as object for flexibility)
    levelRoles: {
        type: Map,
        of: String,
        default: new Map([
            ['5', '1468997516438798386'],
            ['10', '1418482439780696075'],
            ['15', '1468997816708763678'],
            ['20', '1418482638636711986'],
            ['30', '1418482772623757462'],
            ['40', '1418482904899784714'],
            ['50', '1468998089342718113'],
            ['60', '1468998169659703306'],
            ['70', '1468998265491030173'],
            ['80', '1468998339482616103'],
            ['90', '1468998450392858715'],
            ['100', '1468998530419916860']
        ])
    },
    // Booster Color Roles
    boosterColorRoles: {
        type: [String],
        default: [
            '1420116050241916960',
            '1420116266215276756',
            '1420115860709703720',
            '1420115958751695019',
            '1420116175471509555',
            '1419057034569060556',
            '1420117422265995355',
            '1420117272726474923',
            '1420117462917189835',
            '1419049525481570355',
            '1420115710302093332'
        ]
    },
    // Booster Colors Channel
    boosterColorsChannelId: {
        type: String,
        default: '1419139219019792546'
    },
    // Server Booster Role
    serverBoosterRoleId: {
        type: String,
        default: '1389359639635951698'
    },
    // Moderator Role
    moderatorRoleId: {
        type: String,
        default: null
    },
    // Admin Role
    adminRoleId: {
        type: String,
        default: null
    },
    // Log Channel
    logChannelId: {
        type: String,
        default: null
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

guildSettingsSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
