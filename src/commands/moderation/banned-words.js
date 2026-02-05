const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addBannedWord, removeBannedWord, getBannedWords, getExcludedWords, reEnableBannedWord } = require('../../utils/bannedWordsInit');
const { isModerator } = require('../../utils/guildSettings');
const { paginateArray, createPaginationButtons } = require('../../utils/embedUtils');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banned-words')
        .setDescription('Manage banned words (Moderator only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a word to the banned list')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to ban')
                        .setRequired(true)
                        .setMaxLength(50)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a word from the banned list (or exclude global word)')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to remove/exclude')
                        .setRequired(true)
                        .setMaxLength(50)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('restore')
                .setDescription('Re-enable a previously excluded global word')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The global word to re-enable')
                        .setRequired(true)
                        .setMaxLength(50)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View server-specific banned words')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('excluded')
                .setDescription('View global words excluded for this server')
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
        
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'add':
                return handleAdd(interaction);
            case 'remove':
                return handleRemove(interaction);
            case 'restore':
                return handleRestore(interaction);
            case 'list':
                return handleList(interaction);
            case 'excluded':
                return handleExcluded(interaction);
        }
    }
};

async function handleAdd(interaction) {
    const word = interaction.options.getString('word');
    
    const result = await addBannedWord(interaction.guild.id, word, interaction.user.id);
    
    if (!result.success) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Failed to Add Word')
                    .setDescription(result.error || 'An error occurred.')
            ],
            ephemeral: true
        });
    }
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Word Banned')
                .setDescription(`||${result.word}|| has been added to the banned words list.`)
        ],
        ephemeral: true
    });
}

async function handleRemove(interaction) {
    const word = interaction.options.getString('word');
    
    const result = await removeBannedWord(interaction.guild.id, word, interaction.user.id);
    
    if (!result.success) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Word Not Found')
                    .setDescription(result.error || 'This word is not in either the server or global banned words list.')
            ],
            ephemeral: true
        });
    }
    
    const description = result.type === 'excluded'
        ? `||${result.word}|| (global word) has been excluded for this server. It will no longer be filtered here.`
        : `||${result.word}|| has been removed from the banned words list.`;
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(result.type === 'excluded' ? 'Global Word Excluded' : 'Word Removed')
                .setDescription(description)
        ],
        ephemeral: true
    });
}

async function handleRestore(interaction) {
    const word = interaction.options.getString('word');
    
    const result = await reEnableBannedWord(interaction.guild.id, word);
    
    if (!result.success) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Word Not Excluded')
                    .setDescription('This word is not in the exclusion list for this server.')
            ],
            ephemeral: true
        });
    }
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Global Word Restored')
                .setDescription(`||${result.word}|| will now be filtered again in this server.`)
        ],
        ephemeral: true
    });
}

async function handleList(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const bannedWords = await getBannedWords(interaction.guild.id, false); // Only server-specific
    
    if (bannedWords.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setTitle('Server Banned Words')
                    .setDescription('No server-specific banned words configured.\n\nNote: Global banned words are still active.')
            ]
        });
    }
    
    let currentPage = 1;
    const itemsPerPage = 20;
    
    const generateEmbed = (page) => {
        const paginated = paginateArray(bannedWords, page, itemsPerPage);
        
        const wordList = paginated.items.map(bw => `||${bw.word}||`).join(', ');
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('Server Banned Words')
            .setDescription(wordList)
            .setFooter({ text: `Page ${paginated.currentPage} of ${paginated.totalPages} | ${paginated.totalItems} words` })
            .setTimestamp();
        
        return { embed, paginated };
    };
    
    const { embed, paginated } = generateEmbed(currentPage);
    
    if (paginated.totalPages === 1) {
        return interaction.editReply({ embeds: [embed] });
    }
    
    const row = createPaginationButtons(currentPage, paginated.totalPages, 'bwlist');
    
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
        
        if (i.customId === 'bwlist_first') currentPage = 1;
        else if (i.customId === 'bwlist_prev') currentPage = Math.max(1, currentPage - 1);
        else if (i.customId === 'bwlist_next') currentPage = Math.min(paginated.totalPages, currentPage + 1);
        else if (i.customId === 'bwlist_last') currentPage = paginated.totalPages;
        
        const { embed: newEmbed, paginated: newPaginated } = generateEmbed(currentPage);
        const newRow = createPaginationButtons(currentPage, newPaginated.totalPages, 'bwlist');
        
        await i.update({ embeds: [newEmbed], components: [newRow] });
    });
    
    collector.on('end', async () => {
        const { embed: finalEmbed } = generateEmbed(currentPage);
        await interaction.editReply({ embeds: [finalEmbed], components: [] }).catch(() => {});
    });
}

async function handleExcluded(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const excludedWords = await getExcludedWords(interaction.guild.id);
    
    if (excludedWords.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setTitle('Excluded Global Words')
                    .setDescription('No global words have been excluded for this server.\n\nUse `/banned-words remove [word]` to exclude a global word.')
            ]
        });
    }
    
    let currentPage = 1;
    const itemsPerPage = 20;
    
    const generateEmbed = (page) => {
        const paginated = paginateArray(excludedWords, page, itemsPerPage);
        
        const wordList = paginated.items.map(ew => `||${ew.word}||`).join(', ');
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('Excluded Global Words')
            .setDescription(`These global words are **NOT** filtered in this server:\n\n${wordList}`)
            .setFooter({ text: `Page ${paginated.currentPage} of ${paginated.totalPages} | ${paginated.totalItems} excluded | Use /banned-words restore to re-enable` })
            .setTimestamp();
        
        return { embed, paginated };
    };
    
    const { embed, paginated } = generateEmbed(currentPage);
    
    if (paginated.totalPages === 1) {
        return interaction.editReply({ embeds: [embed] });
    }
    
    const row = createPaginationButtons(currentPage, paginated.totalPages, 'exlist');
    
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
        
        if (i.customId === 'exlist_first') currentPage = 1;
        else if (i.customId === 'exlist_prev') currentPage = Math.max(1, currentPage - 1);
        else if (i.customId === 'exlist_next') currentPage = Math.min(paginated.totalPages, currentPage + 1);
        else if (i.customId === 'exlist_last') currentPage = paginated.totalPages;
        
        const { embed: newEmbed, paginated: newPaginated } = generateEmbed(currentPage);
        const newRow = createPaginationButtons(currentPage, newPaginated.totalPages, 'exlist');
        
        await i.update({ embeds: [newEmbed], components: [newRow] });
    });
    
    collector.on('end', async () => {
        const { embed: finalEmbed } = generateEmbed(currentPage);
        await interaction.editReply({ embeds: [finalEmbed], components: [] }).catch(() => {});
    });
}
