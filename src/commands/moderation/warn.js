const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Warning = require('../../models/Warning');
const { isModerator, getGuildSettings } = require('../../utils/guildSettings');
const { paginateArray, createPaginationButtons, formatTimestamp } = require('../../utils/embedUtils');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)
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
        const reason = interaction.options.getString('reason');
        
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Invalid Target')
                        .setDescription('You cannot warn yourself.')
                ],
                ephemeral: true
            });
        }
        
        if (targetUser.bot) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Invalid Target')
                        .setDescription('You cannot warn bots.')
                ],
                ephemeral: true
            });
        }
        
        // Create warning
        const warning = new Warning({
            odorId: targetUser.id,
            guildId: interaction.guild.id,
            moderatorId: interaction.user.id,
            reason: reason
        });
        
        await warning.save();
        
        // Count total warnings
        const warningCount = await Warning.countDocuments({
            odorId: targetUser.id,
            guildId: interaction.guild.id
        });
        
        // Try to DM the user
        try {
            await targetUser.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('You Have Been Warned')
                        .setDescription(`You have received a warning in **${interaction.guild.name}**`)
                        .addFields(
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Total Warnings', value: `${warningCount}`, inline: true }
                        )
                        .setTimestamp()
                ]
            });
        } catch (error) {
            // User has DMs disabled
        }
        
        // Log to mod log channel
        const settings = await getGuildSettings(interaction.guild.id);
        if (settings.logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
            if (logChannel) {
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setTitle('Member Warned')
                            .addFields(
                                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                                { name: 'Moderator', value: interaction.user.tag, inline: true },
                                { name: 'Total Warnings', value: `${warningCount}`, inline: true },
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
                    .setColor(config.colors.warning)
                    .setTitle('User Warned')
                    .addFields(
                        { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: 'Total Warnings', value: `${warningCount}`, inline: true },
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true }
                    )
                    .setTimestamp()
            ]
        });
    }
};
