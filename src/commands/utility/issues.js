const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Issue = require('../../models/Issue');
const { isModerator } = require('../../utils/guildSettings');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('issues')
        .setDescription('Report or view bot issues')
        .addSubcommand(subcommand =>
            subcommand
                .setName('report')
                .setDescription('Report a new bot issue')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Brief title for the issue')
                        .setRequired(true)
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Detailed description of the issue')
                        .setRequired(true)
                        .setMaxLength(1000)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('my-issues')
                .setDescription('View your reported issues')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all issues (Moderators only)')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Filter by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Open', value: 'open' },
                            { name: 'In Progress', value: 'in-progress' },
                            { name: 'Resolved', value: 'resolved' },
                            { name: 'Closed', value: 'closed' },
                            { name: 'All', value: 'all' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Update an issue status (Moderators only)')
                .addStringOption(option =>
                    option.setName('issue-id')
                        .setDescription('The issue ID')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('New status')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Open', value: 'open' },
                            { name: 'In Progress', value: 'in-progress' },
                            { name: 'Resolved', value: 'resolved' },
                            { name: 'Closed', value: 'closed' }
                        )
                )
                .addStringOption(option =>
                    option.setName('notes')
                        .setDescription('Moderator notes')
                        .setRequired(false)
                        .setMaxLength(500)
                )
        ),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'report':
                return handleReport(interaction);
            case 'my-issues':
                return handleMyIssues(interaction);
            case 'list':
                return handleList(interaction);
            case 'update':
                return handleUpdate(interaction);
        }
    }
};

async function handleReport(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    
    const issue = new Issue({
        guildId: interaction.guild.id,
        odorId: interaction.user.id,
        username: interaction.user.tag,
        title,
        description
    });
    
    await issue.save();
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Issue Reported')
                .setDescription('Your issue has been submitted successfully. A moderator will review it soon.')
                .addFields(
                    { name: 'Issue ID', value: `\`${issue._id}\``, inline: true },
                    { name: 'Title', value: title, inline: true },
                    { name: 'Status', value: '🟡 Open', inline: true }
                )
                .setFooter({ text: 'Use /issues my-issues to track your reports' })
                .setTimestamp()
        ],
        ephemeral: true
    });
}

async function handleMyIssues(interaction) {
    const issues = await Issue.find({
        guildId: interaction.guild.id,
        odorId: interaction.user.id
    }).sort({ createdAt: -1 }).limit(10);
    
    if (issues.length === 0) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setTitle('Your Issues')
                    .setDescription('You haven\'t reported any issues yet.')
            ],
            ephemeral: true
        });
    }
    
    const statusEmoji = {
        'open': '🟡',
        'in-progress': '🔵',
        'resolved': '🟢',
        'closed': '⚫'
    };
    
    const issueList = issues.map((issue, i) => {
        return `${statusEmoji[issue.status]} **${issue.title}**\n` +
               `ID: \`${issue._id}\` | Status: ${issue.status}\n` +
               (issue.modNotes ? `📝 Mod Notes: ${issue.modNotes}\n` : '');
    }).join('\n');
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('Your Reported Issues')
                .setDescription(issueList)
                .setFooter({ text: `Showing ${issues.length} most recent issues` })
                .setTimestamp()
        ],
        ephemeral: true
    });
}

async function handleList(interaction) {
    if (!await isModerator(interaction.member)) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Permission Denied')
                    .setDescription('Only moderators can view all issues.')
            ],
            ephemeral: true
        });
    }
    
    const statusFilter = interaction.options.getString('status') || 'open';
    const query = { guildId: interaction.guild.id };
    if (statusFilter !== 'all') {
        query.status = statusFilter;
    }
    
    const issues = await Issue.find(query).sort({ createdAt: -1 });
    
    if (issues.length === 0) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setTitle('Issues')
                    .setDescription(`No ${statusFilter === 'all' ? '' : statusFilter + ' '}issues found.`)
            ],
            ephemeral: true
        });
    }
    
    // Pagination
    const itemsPerPage = 5;
    let currentPage = 0;
    const totalPages = Math.ceil(issues.length / itemsPerPage);
    
    const generateEmbed = (page) => {
        const start = page * itemsPerPage;
        const pageIssues = issues.slice(start, start + itemsPerPage);
        
        const statusEmoji = {
            'open': '🟡',
            'in-progress': '🔵',
            'resolved': '🟢',
            'closed': '⚫'
        };
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`Issues - ${statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`)
            .setFooter({ text: `Page ${page + 1} of ${totalPages} | ${issues.length} total issues` })
            .setTimestamp();
        
        pageIssues.forEach(issue => {
            embed.addFields({
                name: `${statusEmoji[issue.status]} ${issue.title}`,
                value: `**ID:** \`${issue._id}\`\n` +
                       `**By:** ${issue.username}\n` +
                       `**Description:** ${issue.description.substring(0, 100)}${issue.description.length > 100 ? '...' : ''}\n` +
                       `**Created:** <t:${Math.floor(issue.createdAt.getTime() / 1000)}:R>`,
                inline: false
            });
        });
        
        return embed;
    };
    
    const generateButtons = (page) => {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('issues_first')
                    .setLabel('⏮')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('issues_prev')
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('issues_page')
                    .setLabel(`${page + 1}/${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('issues_next')
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('issues_last')
                    .setLabel('⏭')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1)
            );
    };
    
    const response = await interaction.reply({
        embeds: [generateEmbed(currentPage)],
        components: totalPages > 1 ? [generateButtons(currentPage)] : [],
        ephemeral: true
    });
    
    if (totalPages <= 1) return;
    
    const collector = response.createMessageComponentCollector({ time: 300000 });
    
    collector.on('collect', async (i) => {
        if (i.customId === 'issues_first') currentPage = 0;
        else if (i.customId === 'issues_prev') currentPage = Math.max(0, currentPage - 1);
        else if (i.customId === 'issues_next') currentPage = Math.min(totalPages - 1, currentPage + 1);
        else if (i.customId === 'issues_last') currentPage = totalPages - 1;
        
        await i.update({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)]
        });
    });
    
    collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => {});
    });
}

async function handleUpdate(interaction) {
    if (!await isModerator(interaction.member)) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Permission Denied')
                    .setDescription('Only moderators can update issues.')
            ],
            ephemeral: true
        });
    }
    
    const issueId = interaction.options.getString('issue-id');
    const status = interaction.options.getString('status');
    const notes = interaction.options.getString('notes');
    
    try {
        const issue = await Issue.findOneAndUpdate(
            { _id: issueId, guildId: interaction.guild.id },
            {
                status,
                modNotes: notes || undefined,
                resolvedBy: status === 'resolved' ? interaction.user.id : undefined,
                updatedAt: new Date()
            },
            { new: true }
        );
        
        if (!issue) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Issue Not Found')
                        .setDescription('Could not find an issue with that ID.')
                ],
                ephemeral: true
            });
        }
        
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('Issue Updated')
                    .addFields(
                        { name: 'Title', value: issue.title, inline: true },
                        { name: 'New Status', value: status, inline: true },
                        { name: 'Notes', value: notes || 'None', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
        
        // Try to DM the user
        try {
            const user = await interaction.client.users.fetch(issue.odorId);
            await user.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.info)
                        .setTitle('Issue Update')
                        .setDescription(`Your issue "${issue.title}" has been updated.`)
                        .addFields(
                            { name: 'New Status', value: status, inline: true },
                            { name: 'Moderator Notes', value: notes || 'None', inline: false }
                        )
                        .setTimestamp()
                ]
            });
        } catch (error) {
            // User has DMs disabled
        }
    } catch (error) {
        if (error.name === 'CastError') {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Invalid ID')
                        .setDescription('The issue ID provided is not valid.')
                ],
                ephemeral: true
            });
        }
        throw error;
    }
}
