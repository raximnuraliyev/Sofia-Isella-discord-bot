const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuildSettings, updateGuildSettings, isAdmin } = require('../../utils/guildSettings');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure bot settings (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View all bot settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mod-role')
                .setDescription('Set the moderator role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The moderator role')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('admin-role')
                .setDescription('Set the admin role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The admin role')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('log-channel')
                .setDescription('Set the moderation log channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The log channel')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('booster-role')
                .setDescription('Set the server booster role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The server booster role')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('booster-channel')
                .setDescription('Set the booster colors channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel for booster color selection')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome-role')
                .setDescription('Set the role to auto-assign to new members')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The welcome role')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        if (!await isAdmin(interaction.member)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setTitle('Permission Denied')
                        .setDescription('You need administrator permissions to use this command.')
                ],
                ephemeral: true
            });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'view':
                return handleView(interaction);
            case 'mod-role':
                return handleModRole(interaction);
            case 'admin-role':
                return handleAdminRole(interaction);
            case 'log-channel':
                return handleLogChannel(interaction);
            case 'booster-role':
                return handleBoosterRole(interaction);
            case 'booster-channel':
                return handleBoosterChannel(interaction);
            case 'welcome-role':
                return handleWelcomeRole(interaction);
        }
    }
};

async function handleView(interaction) {
    const settings = await getGuildSettings(interaction.guild.id);
    
    const getRole = (id) => id ? interaction.guild.roles.cache.get(id)?.toString() || 'Not found' : 'Not set';
    const getChannel = (id) => id ? interaction.guild.channels.cache.get(id)?.toString() || 'Not found' : 'Not set';
    
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Bot Settings')
        .addFields(
            { name: 'Moderator Role', value: getRole(settings.moderatorRoleId), inline: true },
            { name: 'Admin Role', value: getRole(settings.adminRoleId), inline: true },
            { name: 'Log Channel', value: getChannel(settings.logChannelId), inline: true },
            { name: 'Server Booster Role', value: getRole(settings.serverBoosterRoleId), inline: true },
            { name: 'Booster Colors Channel', value: getChannel(settings.boosterColorsChannelId), inline: true },
            { name: 'Welcome Channel', value: getChannel(settings.welcomeChannelId), inline: true },
            { name: 'Welcome Role', value: getRole(settings.welcomeRoleId), inline: true },
            { name: 'Welcome Enabled', value: settings.welcomeEnabled ? 'Yes' : 'No', inline: true },
            { name: 'Color Roles Count', value: `${settings.boosterColorRoles.length}`, inline: true }
        )
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleModRole(interaction) {
    const role = interaction.options.getRole('role');
    
    await updateGuildSettings(interaction.guild.id, {
        moderatorRoleId: role.id
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Moderator Role Updated')
                .setDescription(`${role} has been set as the moderator role.`)
        ]
    });
}

async function handleAdminRole(interaction) {
    const role = interaction.options.getRole('role');
    
    await updateGuildSettings(interaction.guild.id, {
        adminRoleId: role.id
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Admin Role Updated')
                .setDescription(`${role} has been set as the admin role.`)
        ]
    });
}

async function handleLogChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    await updateGuildSettings(interaction.guild.id, {
        logChannelId: channel.id
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Log Channel Updated')
                .setDescription(`${channel} has been set as the moderation log channel.`)
        ]
    });
}

async function handleBoosterRole(interaction) {
    const role = interaction.options.getRole('role');
    
    await updateGuildSettings(interaction.guild.id, {
        serverBoosterRoleId: role.id
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Booster Role Updated')
                .setDescription(`${role} has been set as the server booster role.`)
        ]
    });
}

async function handleBoosterChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    await updateGuildSettings(interaction.guild.id, {
        boosterColorsChannelId: channel.id
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Booster Colors Channel Updated')
                .setDescription(`${channel} has been set as the booster colors channel.`)
        ]
    });
}

async function handleWelcomeRole(interaction) {
    const role = interaction.options.getRole('role');
    
    await updateGuildSettings(interaction.guild.id, {
        welcomeRoleId: role.id
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Welcome Role Updated')
                .setDescription(`${role} will now be automatically assigned to new members.`)
        ]
    });
}
