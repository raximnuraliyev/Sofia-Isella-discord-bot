const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { generateAIResponse } = require('../../utils/aiUtils');
const config = require('../../config/config');

// Rate limiting
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sofia')
        .setDescription('Talk to Sofia')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('What would you like to say?')
                .setRequired(true)
                .setMaxLength(500)
        ),
    
    cooldown: 30,
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const message = interaction.options.getString('message');
        
        // Check cooldown
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + config.ai.cooldown;
            
            if (Date.now() < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - Date.now()) / 1000);
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.info)
                            .setDescription(`*Sofia needs a moment to gather her thoughts...*\n\nPlease wait ${timeLeft} seconds.`)
                    ],
                    ephemeral: true
                });
            }
        }
        
        await interaction.deferReply();
        
        // Set cooldown
        cooldowns.set(userId, Date.now());
        
        // Generate response
        const response = await generateAIResponse(message);
        
        // Update user interaction stats
        await User.findOneAndUpdate(
            { odorId: userId, guildId: interaction.guild.id },
            {
                $inc: { aiInteractionCount: 1 },
                $set: { lastAiInteraction: new Date() }
            },
            { upsert: true }
        );
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setDescription(response.content);
        
        // Add error indicator if AI failed
        if (!response.success) {
            embed.setFooter({ text: 'Connection was a bit distant...' });
        }
        
        await interaction.editReply({ embeds: [embed] });
    }
};
