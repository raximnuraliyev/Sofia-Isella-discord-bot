const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Warning = require('../../models/Warning');
const { isModerator } = require('../../utils/guildSettings');
const { paginateArray, createPaginationButtons, formatTimestamp } = require('../../utils/embedUtils');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check warnings for')
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
        
        await interaction.deferReply();
        
        const targetUser = interaction.options.getUser('user');
        
        const warnings = await Warning.find({
            odorId: targetUser.id,
            guildId: interaction.guild.id
        }).sort({ createdAt: -1 });
        
        if (warnings.length === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('No Warnings')
                        .setDescription(`${targetUser.tag} has no warnings.`)
                ]
            });
        }
        
        let currentPage = 1;
        const itemsPerPage = 5;
        
        const generateEmbed = async (page) => {
            const paginated = paginateArray(warnings, page, itemsPerPage);
            
            const warningLines = await Promise.all(
                paginated.items.map(async (warning, index) => {
                    const moderator = await interaction.client.users.fetch(warning.moderatorId).catch(() => null);
                    const modName = moderator ? moderator.tag : 'Unknown Moderator';
                    const position = (page - 1) * itemsPerPage + index + 1;
                    
                    return `**${position}.** ${formatTimestamp(warning.createdAt)}\n**Reason:** ${warning.reason}\n**By:** ${modName}\n**ID:** \`${warning._id}\``;
                })
            );
            
            const embed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle(`Warnings for ${targetUser.tag}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(warningLines.join('\n\n'))
                .setFooter({ text: `Page ${paginated.currentPage} of ${paginated.totalPages} | ${paginated.totalItems} total warnings` })
                .setTimestamp();
            
            return { embed, paginated };
        };
        
        const { embed, paginated } = await generateEmbed(currentPage);
        
        if (paginated.totalPages === 1) {
            return interaction.editReply({ embeds: [embed] });
        }
        
        const row = createPaginationButtons(currentPage, paginated.totalPages, 'warnings');
        
        const response = await interaction.editReply({ 
            embeds: [embed], 
            components: [row] 
        });
        
        const collector = response.createMessageComponentCollector({ 
            time: 300000
        });
        
        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'You cannot use these buttons.', ephemeral: true });
            }
            
            if (i.customId === 'warnings_first') currentPage = 1;
            else if (i.customId === 'warnings_prev') currentPage = Math.max(1, currentPage - 1);
            else if (i.customId === 'warnings_next') currentPage = Math.min(paginated.totalPages, currentPage + 1);
            else if (i.customId === 'warnings_last') currentPage = paginated.totalPages;
            
            const { embed: newEmbed, paginated: newPaginated } = await generateEmbed(currentPage);
            const newRow = createPaginationButtons(currentPage, newPaginated.totalPages, 'warnings');
            
            await i.update({ embeds: [newEmbed], components: [newRow] });
        });
        
        collector.on('end', async () => {
            const { embed: finalEmbed } = await generateEmbed(currentPage);
            await interaction.editReply({ embeds: [finalEmbed], components: [] }).catch(() => {});
        });
    }
};
