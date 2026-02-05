const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Warning = require('../../models/Warning');
const { isModerator, getGuildSettings } = require('../../utils/guildSettings');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Remove a warning from a user')
        .addStringOption(option =>
            option.setName('warning-id')
                .setDescription('The ID of the warning to remove (use /warnings to find IDs)')
                .setRequired(true)
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
        
        const warningId = interaction.options.getString('warning-id');
        
        try {
            const warning = await Warning.findOneAndDelete({
                _id: warningId,
                guildId: interaction.guild.id
            });
            
            if (!warning) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('Warning Not Found')
                            .setDescription('Could not find a warning with that ID.')
                    ],
                    ephemeral: true
                });
            }
            
            const targetUser = await interaction.client.users.fetch(warning.odorId).catch(() => null);
            
            // Log to mod log channel
            const settings = await getGuildSettings(interaction.guild.id);
            if (settings.logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
                if (logChannel) {
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(config.colors.info)
                                .setTitle('Warning Removed')
                                .addFields(
                                    { name: 'User', value: targetUser ? `${targetUser.tag} (${targetUser.id})` : warning.odorId, inline: true },
                                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                                    { name: 'Original Reason', value: warning.reason, inline: false }
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
                        .setTitle('Warning Removed')
                        .addFields(
                            { name: 'User', value: targetUser ? targetUser.tag : warning.odorId, inline: true },
                            { name: 'Original Reason', value: warning.reason, inline: false },
                            { name: 'Removed By', value: interaction.user.tag, inline: true }
                        )
                        .setTimestamp()
                ]
            });
        } catch (error) {
            if (error.name === 'CastError') {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('Invalid ID')
                            .setDescription('The warning ID provided is not valid.')
                    ],
                    ephemeral: true
                });
            }
            throw error;
        }
    }
};
