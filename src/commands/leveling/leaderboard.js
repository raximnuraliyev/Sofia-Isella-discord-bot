const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');
const { paginateArray, createPaginationButtons } = require('../../utils/embedUtils');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server XP leaderboard'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const users = await User.find({ guildId: interaction.guild.id })
            .sort({ totalXp: -1 })
            .lean();
        
        if (users.length === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.info)
                        .setDescription('No users have earned XP yet.')
                ]
            });
        }
        
        let currentPage = 1;
        const itemsPerPage = 10;
        
        const generateEmbed = async (page) => {
            const paginated = paginateArray(users, page, itemsPerPage);
            
            const leaderboardLines = await Promise.all(
                paginated.items.map(async (user, index) => {
                    const position = (page - 1) * itemsPerPage + index + 1;
                    const member = await interaction.guild.members.fetch(user.odorId).catch(() => null);
                    const username = member ? member.user.username : 'Unknown User';
                    
                    let medal = '';
                    if (position === 1) medal = '  ';
                    else if (position === 2) medal = '  ';
                    else if (position === 3) medal = '  ';
                    
                    return `**${position}.** ${medal}${username}\nLevel ${user.level} | ${user.totalXp.toLocaleString()} XP`;
                })
            );
            
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('XP Leaderboard')
                .setDescription(leaderboardLines.join('\n\n'))
                .setFooter({ text: `Page ${paginated.currentPage} of ${paginated.totalPages} | ${paginated.totalItems} total users` })
                .setTimestamp();
            
            return { embed, paginated };
        };
        
        const { embed, paginated } = await generateEmbed(currentPage);
        
        if (paginated.totalPages === 1) {
            return interaction.editReply({ embeds: [embed] });
        }
        
        const row = createPaginationButtons(currentPage, paginated.totalPages, 'lb');
        
        const response = await interaction.editReply({ 
            embeds: [embed], 
            components: [row] 
        });
        
        const collector = response.createMessageComponentCollector({ 
            time: 300000 // 5 minutes
        });
        
        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ 
                    content: 'You cannot use these buttons.', 
                    ephemeral: true 
                });
            }
            
            if (i.customId === 'lb_first') currentPage = 1;
            else if (i.customId === 'lb_prev') currentPage = Math.max(1, currentPage - 1);
            else if (i.customId === 'lb_next') currentPage = Math.min(paginated.totalPages, currentPage + 1);
            else if (i.customId === 'lb_last') currentPage = paginated.totalPages;
            
            const { embed: newEmbed, paginated: newPaginated } = await generateEmbed(currentPage);
            const newRow = createPaginationButtons(currentPage, newPaginated.totalPages, 'lb');
            
            await i.update({ embeds: [newEmbed], components: [newRow] });
        });
        
        collector.on('end', async () => {
            const { embed: finalEmbed } = await generateEmbed(currentPage);
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('lb_first').setLabel('First').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('lb_prev').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId('lb_page').setLabel(`${currentPage} / ${paginated.totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('lb_next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId('lb_last').setLabel('Last').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
            
            await interaction.editReply({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => {});
        });
    }
};
