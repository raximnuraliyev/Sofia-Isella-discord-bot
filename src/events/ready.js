const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        console.log(`Serving ${client.guilds.cache.size} guild(s)`);
        
        // Set bot presence
        client.user.setPresence({
            activities: [{ name: 'with Sofia', type: 0 }],
            status: 'online'
        });
    }
};
