const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildSettings, updateGuildSettings, isModerator, levelRolesToObject } = require('../../utils/guildSettings');
const { paginateArray, createPaginationButtons } = require('../../utils/embedUtils');
const { xpForLevel, totalXpForLevel } = require('../../utils/levelUtils');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xp-settings')
        .setDescription('View or modify XP and leveling settings (Moderator only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current XP settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-message-xp')
                .setDescription('Set XP range for messages')
                .addIntegerOption(option =>
                    option.setName('min')
                        .setDescription('Minimum XP per message')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
                .addIntegerOption(option =>
                    option.setName('max')
                        .setDescription('Maximum XP per message')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-attachment-xp')
                .setDescription('Set bonus XP range for attachments')
                .addIntegerOption(option =>
                    option.setName('min')
                        .setDescription('Minimum bonus XP per attachment')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
                .addIntegerOption(option =>
                    option.setName('max')
                        .setDescription('Maximum bonus XP per attachment')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-cooldown')
                .setDescription('Set XP gain cooldown in seconds')
                .addIntegerOption(option =>
                    option.setName('seconds')
                        .setDescription('Cooldown in seconds')
                        .setRequired(true)
                        .setMinValue(10)
                        .setMaxValue(300)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-level-role')
                .setDescription('Set or update a level role milestone')
                .addIntegerOption(option =>
                    option.setName('level')
                        .setDescription('The level milestone')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to assign at this level')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-level-role')
                .setDescription('Remove a level role milestone')
                .addIntegerOption(option =>
                    option.setName('level')
                        .setDescription('The level milestone to remove')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list-level-roles')
                .setDescription('View all level role milestones with XP requirements')
        ),
    
    async execute(interaction) {
        // Check moderator permissions
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
        const settings = await getGuildSettings(interaction.guild.id);
        
        switch (subcommand) {
            case 'view':
                return handleView(interaction, settings);
            case 'set-message-xp':
                return handleSetMessageXP(interaction, settings);
            case 'set-attachment-xp':
                return handleSetAttachmentXP(interaction, settings);
            case 'set-cooldown':
                return handleSetCooldown(interaction, settings);
            case 'set-level-role':
                return handleSetLevelRole(interaction, settings);
            case 'remove-level-role':
                return handleRemoveLevelRole(interaction, settings);
            case 'list-level-roles':
                return handleListLevelRoles(interaction, settings);
        }
    }
};

async function handleView(interaction, settings) {
    const levelRoles = levelRolesToObject(settings.levelRoles);
    const milestoneCount = Object.keys(levelRoles).length;
    
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('XP Settings')
        .addFields(
            { 
                name: 'Message XP', 
                value: `${settings.xpSettings.messageXPMin} - ${settings.xpSettings.messageXPMax}`, 
                inline: true 
            },
            { 
                name: 'Attachment Bonus XP', 
                value: `${settings.xpSettings.attachmentXPMin} - ${settings.xpSettings.attachmentXPMax}`, 
                inline: true 
            },
            { 
                name: 'Cooldown', 
                value: `${settings.xpSettings.cooldown / 1000} seconds`, 
                inline: true 
            },
            { 
                name: 'Level Milestones', 
                value: `${milestoneCount} configured`, 
                inline: true 
            },
            { 
                name: 'Max Level', 
                value: `${config.xp.maxLevel}`, 
                inline: true 
            }
        )
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleSetMessageXP(interaction, settings) {
    const min = interaction.options.getInteger('min');
    const max = interaction.options.getInteger('max');
    
    if (min > max) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Invalid Range')
                    .setDescription('Minimum XP cannot be greater than maximum XP.')
            ],
            ephemeral: true
        });
    }
    
    await updateGuildSettings(interaction.guild.id, {
        'xpSettings.messageXPMin': min,
        'xpSettings.messageXPMax': max
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Settings Updated')
                .setDescription(`Message XP range set to **${min} - ${max}**`)
        ]
    });
}

async function handleSetAttachmentXP(interaction, settings) {
    const min = interaction.options.getInteger('min');
    const max = interaction.options.getInteger('max');
    
    if (min > max) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Invalid Range')
                    .setDescription('Minimum XP cannot be greater than maximum XP.')
            ],
            ephemeral: true
        });
    }
    
    await updateGuildSettings(interaction.guild.id, {
        'xpSettings.attachmentXPMin': min,
        'xpSettings.attachmentXPMax': max
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Settings Updated')
                .setDescription(`Attachment bonus XP range set to **${min} - ${max}**`)
        ]
    });
}

async function handleSetCooldown(interaction, settings) {
    const seconds = interaction.options.getInteger('seconds');
    
    await updateGuildSettings(interaction.guild.id, {
        'xpSettings.cooldown': seconds * 1000
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Settings Updated')
                .setDescription(`XP cooldown set to **${seconds} seconds**`)
        ]
    });
}

async function handleSetLevelRole(interaction, settings) {
    const level = interaction.options.getInteger('level');
    const role = interaction.options.getRole('role');
    
    const levelRoles = settings.levelRoles instanceof Map 
        ? settings.levelRoles 
        : new Map(Object.entries(settings.levelRoles || {}));
    
    levelRoles.set(level.toString(), role.id);
    
    await updateGuildSettings(interaction.guild.id, {
        levelRoles: levelRoles
    });
    
    const xpRequired = totalXpForLevel(level);
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Level Role Set')
                .setDescription(`Level **${level}** milestone now awards ${role}`)
                .addFields({ name: 'XP Required', value: `${xpRequired.toLocaleString()} total XP`, inline: true })
        ]
    });
}

async function handleRemoveLevelRole(interaction, settings) {
    const level = interaction.options.getInteger('level');
    
    const levelRoles = settings.levelRoles instanceof Map 
        ? settings.levelRoles 
        : new Map(Object.entries(settings.levelRoles || {}));
    
    if (!levelRoles.has(level.toString())) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Not Found')
                    .setDescription(`No role milestone exists for level ${level}.`)
            ],
            ephemeral: true
        });
    }
    
    levelRoles.delete(level.toString());
    
    await updateGuildSettings(interaction.guild.id, {
        levelRoles: levelRoles
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Level Role Removed')
                .setDescription(`Level **${level}** milestone has been removed.`)
        ]
    });
}

async function handleListLevelRoles(interaction, settings) {
    await interaction.deferReply();
    
    const levelRoles = levelRolesToObject(settings.levelRoles);
    const milestones = Object.entries(levelRoles)
        .map(([level, roleId]) => ({
            level: parseInt(level),
            roleId,
            xpRequired: totalXpForLevel(parseInt(level))
        }))
        .sort((a, b) => a.level - b.level);
    
    if (milestones.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setDescription('No level role milestones configured.')
            ]
        });
    }
    
    let currentPage = 1;
    const itemsPerPage = 10;
    
    const generateEmbed = (page) => {
        const paginated = paginateArray(milestones, page, itemsPerPage);
        
        const lines = paginated.items.map(m => {
            const role = interaction.guild.roles.cache.get(m.roleId);
            const roleName = role ? role.toString() : 'Unknown Role';
            return `**Level ${m.level}** - ${roleName}\nXP Required: ${m.xpRequired.toLocaleString()}`;
        });
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('Level Role Milestones')
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: `Page ${paginated.currentPage} of ${paginated.totalPages} | ${paginated.totalItems} milestones` })
            .setTimestamp();
        
        return { embed, paginated };
    };
    
    const { embed, paginated } = generateEmbed(currentPage);
    
    if (paginated.totalPages === 1) {
        return interaction.editReply({ embeds: [embed] });
    }
    
    const row = createPaginationButtons(currentPage, paginated.totalPages, 'lvlroles');
    
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
        
        if (i.customId === 'lvlroles_first') currentPage = 1;
        else if (i.customId === 'lvlroles_prev') currentPage = Math.max(1, currentPage - 1);
        else if (i.customId === 'lvlroles_next') currentPage = Math.min(paginated.totalPages, currentPage + 1);
        else if (i.customId === 'lvlroles_last') currentPage = paginated.totalPages;
        
        const { embed: newEmbed, paginated: newPaginated } = generateEmbed(currentPage);
        const newRow = createPaginationButtons(currentPage, newPaginated.totalPages, 'lvlroles');
        
        await i.update({ embeds: [newEmbed], components: [newRow] });
    });
    
    collector.on('end', async () => {
        const { embed: finalEmbed } = generateEmbed(currentPage);
        await interaction.editReply({ embeds: [finalEmbed], components: [] }).catch(() => {});
    });
}
