const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: 'Measuring...', 
            fetchReply: true 
        });
        
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('Latency')
            .addFields(
                { name: 'Round-trip', value: `${latency}ms`, inline: true },
                { name: 'API', value: `${apiLatency}ms`, inline: true }
            )
            .setTimestamp();
        
        await interaction.editReply({ content: null, embeds: [embed] });
    }
};
