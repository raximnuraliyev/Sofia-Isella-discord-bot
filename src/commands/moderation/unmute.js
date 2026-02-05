const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator, getGuildSettings } = require('../../utils/guildSettings');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a user (unmute)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unmute')
                .setRequired(false)
                .setMaxLength(500)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
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
        
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('User Not Found')
                        .setDescription('This user is not in the server.')
                ],
                ephemeral: true
            });
        }
        
        if (!targetMember.isCommunicationDisabled()) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.info)
                        .setTitle('Not Muted')
                        .setDescription('This user is not currently muted.')
                ],
                ephemeral: true
            });
        }
        
        try {
            await targetMember.timeout(null, `${reason} | Unmuted by ${interaction.user.tag}`);
            
            const settings = await getGuildSettings(interaction.guild.id);
            
            // Log to mod log channel
            if (settings.logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
                if (logChannel) {
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(config.colors.success)
                                .setTitle('Member Unmuted')
                                .addFields(
                                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                                    { name: 'Reason', value: reason, inline: false }
                                )
                                .setTimestamp()
                        ]
                    });
                }
            }
            
            // Try to DM the user
            try {
                await targetUser.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.success)
                            .setTitle('You Have Been Unmuted')
                            .setDescription(`Your mute in **${interaction.guild.name}** has been lifted.`)
                            .setTimestamp()
                    ]
                });
            } catch (error) {
                // User has DMs disabled
            }
            
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('User Unmuted')
                        .addFields(
                            { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Moderator', value: interaction.user.tag, inline: true }
                        )
                        .setTimestamp()
                ]
            });
        } catch (error) {
            console.error('Unmute error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Unmute Failed')
                        .setDescription('An error occurred while trying to unmute this user.')
                ],
                ephemeral: true
            });
        }
    }
};
