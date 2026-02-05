const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { getGuildSettings, updateGuildSettings, isModerator } = require('../../utils/guildSettings');
const { paginateArray, createPaginationButtons } = require('../../utils/embedUtils');
const BoosterColorMessage = require('../../models/BoosterColorMessage');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('booster-colors')
        .setDescription('Manage booster color roles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up or refresh the booster colors message (Moderator only)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-role')
                .setDescription('Add a booster color role (Moderator only)')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The color role to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-role')
                .setDescription('Remove a booster color role (Moderator only)')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The color role to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all booster color roles')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // List is available to everyone
        if (subcommand === 'list') {
            return handleList(interaction);
        }
        
        // Other commands require moderator
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
        
        switch (subcommand) {
            case 'setup':
                return handleSetup(interaction);
            case 'add-role':
                return handleAddRole(interaction);
            case 'remove-role':
                return handleRemoveRole(interaction);
        }
    }
};

async function handleSetup(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const settings = await getGuildSettings(interaction.guild.id);
    const channelId = settings.boosterColorsChannelId;
    
    if (!channelId) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Channel Not Configured')
                    .setDescription('Booster colors channel is not configured. Update the guild settings first.')
            ]
        });
    }
    
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Channel Not Found')
                    .setDescription('The configured booster colors channel could not be found.')
            ]
        });
    }
    
    // Delete old message if exists
    const existingMessage = await BoosterColorMessage.findOne({ guildId: interaction.guild.id });
    if (existingMessage) {
        try {
            const oldChannel = interaction.guild.channels.cache.get(existingMessage.channelId);
            if (oldChannel) {
                const oldMessage = await oldChannel.messages.fetch(existingMessage.messageId).catch(() => null);
                if (oldMessage) await oldMessage.delete().catch(() => {});
            }
        } catch (error) {
            // Ignore errors when deleting old message
        }
    }
    
    // Create buttons for each color role
    const colorRoles = settings.boosterColorRoles;
    
    if (colorRoles.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('No Color Roles')
                    .setDescription('No booster color roles are configured.')
            ]
        });
    }
    
    // Create button rows (max 5 buttons per row, max 5 rows)
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;
    
    for (const roleId of colorRoles) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) continue;
        
        const button = new ButtonBuilder()
            .setCustomId(`booster_color_${roleId}`)
            .setLabel(role.name)
            .setStyle(ButtonStyle.Secondary);
        
        currentRow.addComponents(button);
        buttonCount++;
        
        if (buttonCount % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
    }
    
    // Add any remaining buttons
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }
    
    // Limit to 5 rows
    const limitedRows = rows.slice(0, 5);
    
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Booster Color Roles')
        .setDescription('Thank you for boosting the server! As a booster, you can select a custom color role for your name.\n\nClick a button below to select your color. Click again to remove it.')
        .setFooter({ text: 'This feature is exclusive to Server Boosters' });
    
    // Send the message
    const sentMessage = await channel.send({
        embeds: [embed],
        components: limitedRows
    });
    
    // Save message reference
    await BoosterColorMessage.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
            guildId: interaction.guild.id,
            channelId: channel.id,
            messageId: sentMessage.id
        },
        { upsert: true }
    );
    
    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Setup Complete')
                .setDescription(`Booster colors message has been sent to ${channel}.`)
        ]
    });
}

async function handleAddRole(interaction) {
    const role = interaction.options.getRole('role');
    const settings = await getGuildSettings(interaction.guild.id);
    
    if (settings.boosterColorRoles.includes(role.id)) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Already Added')
                    .setDescription('This role is already a booster color role.')
            ],
            ephemeral: true
        });
    }
    
    const newColorRoles = [...settings.boosterColorRoles, role.id];
    await updateGuildSettings(interaction.guild.id, { boosterColorRoles: newColorRoles });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(role.color || config.colors.success)
                .setTitle('Color Role Added')
                .setDescription(`${role} has been added as a booster color role.\n\nUse \`/booster-colors setup\` to refresh the selection message.`)
        ]
    });
}

async function handleRemoveRole(interaction) {
    const role = interaction.options.getRole('role');
    const settings = await getGuildSettings(interaction.guild.id);
    
    if (!settings.boosterColorRoles.includes(role.id)) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Not Found')
                    .setDescription('This role is not a booster color role.')
            ],
            ephemeral: true
        });
    }
    
    const newColorRoles = settings.boosterColorRoles.filter(id => id !== role.id);
    await updateGuildSettings(interaction.guild.id, { boosterColorRoles: newColorRoles });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Color Role Removed')
                .setDescription(`${role} has been removed from booster color roles.\n\nUse \`/booster-colors setup\` to refresh the selection message.`)
        ]
    });
}

async function handleList(interaction) {
    await interaction.deferReply();
    
    const settings = await getGuildSettings(interaction.guild.id);
    const colorRoles = settings.boosterColorRoles;
    
    if (colorRoles.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setDescription('No booster color roles configured.')
            ]
        });
    }
    
    // Map role IDs to role objects
    const roles = colorRoles
        .map((id, index) => {
            const role = interaction.guild.roles.cache.get(id);
            return role ? { index: index + 1, role } : null;
        })
        .filter(Boolean);
    
    let currentPage = 1;
    const itemsPerPage = 10;
    
    const generateEmbed = (page) => {
        const paginated = paginateArray(roles, page, itemsPerPage);
        
        const lines = paginated.items.map(r => `**${r.index}.** ${r.role}`);
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('Booster Color Roles')
            .setDescription(lines.join('\n'))
            .setFooter({ text: `Page ${paginated.currentPage} of ${paginated.totalPages} | ${paginated.totalItems} colors` })
            .setTimestamp();
        
        return { embed, paginated };
    };
    
    const { embed, paginated } = generateEmbed(currentPage);
    
    if (paginated.totalPages === 1) {
        return interaction.editReply({ embeds: [embed] });
    }
    
    const row = createPaginationButtons(currentPage, paginated.totalPages, 'bclist');
    
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
        
        if (i.customId === 'bclist_first') currentPage = 1;
        else if (i.customId === 'bclist_prev') currentPage = Math.max(1, currentPage - 1);
        else if (i.customId === 'bclist_next') currentPage = Math.min(paginated.totalPages, currentPage + 1);
        else if (i.customId === 'bclist_last') currentPage = paginated.totalPages;
        
        const { embed: newEmbed, paginated: newPaginated } = generateEmbed(currentPage);
        const newRow = createPaginationButtons(currentPage, newPaginated.totalPages, 'bclist');
        
        await i.update({ embeds: [newEmbed], components: [newRow] });
    });
    
    collector.on('end', async () => {
        const { embed: finalEmbed } = generateEmbed(currentPage);
        await interaction.editReply({ embeds: [finalEmbed], components: [] }).catch(() => {});
    });
}
