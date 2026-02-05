const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator, getGuildSettings } = require('../../utils/guildSettings');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option =>
            option.setName('user-id')
                .setDescription('The ID of the user to unban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unban')
                .setRequired(false)
                .setMaxLength(500)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        if (!await isModerator(interaction.member)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Permission Denied')
                        .setDescription('You need moderator permissions to use this command.')
                ],
                ephemeral: true
            });
        }
        
        const userId = interaction.options.getString('user-id');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Validate user ID format
        if (!/^\d{17,19}$/.test(userId)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Invalid User ID')
                        .setDescription('Please provide a valid Discord user ID.')
                ],
                ephemeral: true
            });
        }
        
        try {
            // Check if user is banned
            const banList = await interaction.guild.bans.fetch();
            const bannedUser = banList.get(userId);
            
            if (!bannedUser) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('User Not Banned')
                            .setDescription('This user is not currently banned from the server.')
                    ],
                    ephemeral: true
                });
            }
            
            await interaction.guild.members.unban(userId, `${reason} | Unbanned by ${interaction.user.tag}`);
            
            const settings = await getGuildSettings(interaction.guild.id);
            
            // Log to mod log channel
            if (settings.logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
                if (logChannel) {
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setTitle('Member Unbanned')
                                .addFields(
                                    { name: 'User', value: `${bannedUser.user.tag} (${userId})`, inline: true },
                                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                                    { name: 'Reason', value: reason, inline: false }
                                )
                                .setTimestamp()
                        ]
                    });
                }
            }
            
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('User Unbanned')
                        .addFields(
                            { name: 'User', value: `${bannedUser.user.tag} (${userId})`, inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Moderator', value: interaction.user.tag, inline: true }
                        )
                        .setTimestamp()
                ]
            });
        } catch (error) {
            console.error('Unban error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Unban Failed')
                        .setDescription('An error occurred while trying to unban this user.')
                ],
                ephemeral: true
            });
        }
    }
};
