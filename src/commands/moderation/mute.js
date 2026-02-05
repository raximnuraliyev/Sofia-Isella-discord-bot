const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator, getGuildSettings } = require('../../utils/guildSettings');
const { formatDuration } = require('../../utils/embedUtils');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout a user (mute)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mute')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320) // Max 28 days
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
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
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const durationMs = duration * 60 * 1000;
        
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Invalid Target')
                        .setDescription('You cannot mute yourself.')
                ],
                ephemeral: true
            });
        }
        
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
        
        if (!targetMember.moderatable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Cannot Mute')
                        .setDescription('I do not have permission to mute this user. They may have higher permissions than me.')
                ],
                ephemeral: true
            });
        }
        
        if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Cannot Mute')
                        .setDescription('You cannot mute a member with equal or higher role than you.')
                ],
                ephemeral: true
            });
        }
        
        try {
            // Try to DM the user
            try {
                await targetUser.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setTitle('You Have Been Muted')
                            .setDescription(`You have been muted in **${interaction.guild.name}**`)
                            .addFields(
                                { name: 'Duration', value: formatDuration(durationMs), inline: true },
                                { name: 'Reason', value: reason, inline: false }
                            )
                            .setTimestamp()
                    ]
                });
            } catch (error) {
                // User has DMs disabled
            }
            
            await targetMember.timeout(durationMs, `${reason} | Muted by ${interaction.user.tag}`);
            
            const settings = await getGuildSettings(interaction.guild.id);
            
            // Log to mod log channel
            if (settings.logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
                if (logChannel) {
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(config.colors.warning)
                                .setTitle('Member Muted')
                                .addFields(
                                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                                    { name: 'Duration', value: formatDuration(durationMs), inline: true },
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
                        .setTitle('User Muted')
                        .addFields(
                            { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                            { name: 'Duration', value: formatDuration(durationMs), inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Moderator', value: interaction.user.tag, inline: true }
                        )
                        .setTimestamp()
                ]
            });
        } catch (error) {
            console.error('Mute error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Mute Failed')
                        .setDescription('An error occurred while trying to mute this user.')
                ],
                ephemeral: true
            });
        }
    }
};
