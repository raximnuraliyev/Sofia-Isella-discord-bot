const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config/config');

/**
 * Create a standard embed with consistent styling
 */
function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.color || config.colors.primary)
        .setTimestamp();

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.author) embed.setAuthor(options.author);
    if (options.footer) embed.setFooter(options.footer);
    if (options.fields) embed.addFields(options.fields);

    return embed;
}

/**
 * Create success embed
 */
function successEmbed(title, description) {
    return createEmbed({
        title,
        description,
        color: config.colors.success
    });
}

/**
 * Create error embed
 */
function errorEmbed(title, description) {
    return createEmbed({
        title,
        description,
        color: config.colors.error
    });
}

/**
 * Create warning embed
 */
function warningEmbed(title, description) {
    return createEmbed({
        title,
        description,
        color: config.colors.warning
    });
}

/**
 * Create info embed
 */
function infoEmbed(title, description) {
    return createEmbed({
        title,
        description,
        color: config.colors.info
    });
}

/**
 * Create pagination buttons
 */
function createPaginationButtons(currentPage, totalPages, customIdPrefix) {
    const row = new ActionRowBuilder();

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_first`)
            .setLabel('First')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 1),
        new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_prev`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 1),
        new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_page`)
            .setLabel(`${currentPage} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_next`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === totalPages),
        new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_last`)
            .setLabel('Last')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages)
    );

    return row;
}

/**
 * Paginate an array of items
 */
function paginateArray(array, page, itemsPerPage = config.pagination.itemsPerPage) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const items = array.slice(startIndex, endIndex);
    const totalPages = Math.ceil(array.length / itemsPerPage) || 1;

    return {
        items,
        currentPage: page,
        totalPages,
        totalItems: array.length,
        hasNext: page < totalPages,
        hasPrev: page > 1
    };
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date, format = 'R') {
    const timestamp = Math.floor(date.getTime() / 1000);
    return `<t:${timestamp}:${format}>`;
}

/**
 * Format duration in milliseconds to readable string
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = {
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
    createPaginationButtons,
    paginateArray,
    formatTimestamp,
    formatDuration
};
