module.exports = {
    // XP Settings
    xp: {
        messageXP: { min: 15, max: 25 },
        attachmentXP: { min: 20, max: 35 },
        cooldown: 60000, // 1 minute cooldown between XP gains
        maxLevel: 100
    },

    // Level Role Milestones
    levelRoles: {
        5: '1468997516438798386',
        10: '1418482439780696075',
        15: '1468997816708763678',
        20: '1418482638636711986',
        30: '1418482772623757462',
        40: '1418482904899784714',
        50: '1468998089342718113',
        60: '1468998169659703306',
        70: '1468998265491030173',
        80: '1468998339482616103',
        90: '1468998450392858715',
        100: '1468998530419916860'
    },

    // Booster Color Roles
    boosterColorRoles: [
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
    ],

    // Channel IDs
    channels: {
        boosterColors: '1419139219019792546'
    },

    // Role IDs
    roles: {
        serverBooster: '1389359639635951698'
    },

    // AI Settings
    ai: {
        cooldown: 30000, // 30 seconds cooldown per user
        maxTokens: 300
    },

    // Daily Game Settings
    dailyGame: {
        cooldown: 86400000, // 24 hours in milliseconds
        xpReward: { min: 50, max: 100 }
    },

    // Embed Colors
    colors: {
        primary: 0xE8B4D8, // Soft pink
        success: 0x98D4BB, // Soft green
        error: 0xE88B8B, // Soft red
        warning: 0xF5D79E, // Soft yellow
        info: 0xA8C5E2, // Soft blue
        levelUp: 0xD4A8E8 // Soft purple
    },

    // Pagination
    pagination: {
        itemsPerPage: 10
    }
};
