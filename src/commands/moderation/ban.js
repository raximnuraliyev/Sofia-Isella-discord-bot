const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator, getGuildSettings } = require('../../utils/guildSettings');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)
                .setMaxLength(500)
        )
        .addIntegerOption(option =>
            option.setName('delete-messages')
                .setDescription('Number of days of messages to delete (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7)
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
        
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessageDays = interaction.options.getInteger('delete-messages') || 0;
        
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Invalid Target')
                        .setDescription('You cannot ban yourself.')
                ],
                ephemeral: true
            });
        }
        
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (targetMember) {
            if (!targetMember.bannable) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('Cannot Ban')
                            .setDescription('I do not have permission to ban this user. They may have higher permissions than me.')
                    ],
                    ephemeral: true
                });
            }
            
            if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('Cannot Ban')
                            .setDescription('You cannot ban a member with equal or higher role than you.')
                    ],
                    ephemeral: true
                });
            }
        }
        
        // Try to DM the user before banning
        try {
            await targetUser.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('You Have Been Banned')
                        .setDescription(`You have been banned from **${interaction.guild.name}**`)
                        .addFields({ name: 'Reason', value: reason })
                        .setTimestamp()
                ]
            });
        } catch (error) {
            // User has DMs disabled
        }
        
        try {
            await interaction.guild.members.ban(targetUser.id, {
                reason: `${reason} | Banned by ${interaction.user.tag}`,
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
            });
            
            const settings = await getGuildSettings(interaction.guild.id);
            
            // Log to mod log channel
            if (settings.logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
                if (logChannel) {
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(config.colors.error)
                                .setTitle('Member Banned')
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
            
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('User Banned')
                        .addFields(
                            { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Moderator', value: interaction.user.tag, inline: true }
                        )
                        .setTimestamp()
                ]
            });
        } catch (error) {
            console.error('Ban error:', error);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Ban Failed')
                        .setDescription('An error occurred while trying to ban this user.')
                ],
                ephemeral: true
            });
        }
    }
};
