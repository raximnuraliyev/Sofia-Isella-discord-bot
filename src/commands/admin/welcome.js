const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuildSettings, updateGuildSettings, isModerator } = require('../../utils/guildSettings');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure welcome messages (Moderator only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current welcome settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the welcome channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel for welcome messages')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('message')
                .setDescription('Set the welcome message')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The welcome message (use {user}, {username}, {server}, {memberCount})')
                        .setRequired(true)
                        .setMaxLength(1000)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable welcome messages')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable welcome messages?')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Send a test welcome message')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rules-channel')
                .setDescription('Set the rules channel for welcome message')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The rules channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('roles-channel')
                .setDescription('Set the roles channel for welcome message')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The roles channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('intro-channel')
                .setDescription('Set the introduction channel for welcome message')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The introduction channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('main-channel')
                .setDescription('Set the main channel for welcome message')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The main channel')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('image')
                .setDescription('Set the welcome image URL')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('The image URL (or "none" to remove)')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
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
        const settings = await getGuildSettings(interaction.guild.id);
        
        switch (subcommand) {
            case 'view':
                return handleView(interaction, settings);
            case 'channel':
                return handleChannel(interaction);
            case 'message':
                return handleMessage(interaction);
            case 'toggle':
                return handleToggle(interaction);
            case 'test':
                return handleTest(interaction, settings);
            case 'rules-channel':
                return handleRulesChannel(interaction);
            case 'roles-channel':
                return handleRolesChannel(interaction);
            case 'intro-channel':
                return handleIntroChannel(interaction);
            case 'main-channel':
                return handleMainChannel(interaction);
            case 'image':
                return handleImage(interaction);
        }
    }
};

async function handleView(interaction, settings) {
    const channel = settings.welcomeChannelId 
        ? interaction.guild.channels.cache.get(settings.welcomeChannelId) 
        : null;
    const rulesChannel = settings.rulesChannelId 
        ? interaction.guild.channels.cache.get(settings.rulesChannelId) 
        : null;
    const rolesChannel = settings.rolesChannelId 
        ? interaction.guild.channels.cache.get(settings.rolesChannelId) 
        : null;
    const introChannel = settings.introChannelId 
        ? interaction.guild.channels.cache.get(settings.introChannelId) 
        : null;
    const mainChannel = settings.mainChannelId 
        ? interaction.guild.channels.cache.get(settings.mainChannelId) 
        : null;
    
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Welcome Settings')
        .addFields(
            { 
                name: 'Status', 
                value: settings.welcomeEnabled ? '✅ Enabled' : '❌ Disabled', 
                inline: true 
            },
            { 
                name: 'Welcome Channel', 
                value: channel ? channel.toString() : 'Not set', 
                inline: true 
            },
            { 
                name: 'Welcome Image', 
                value: settings.welcomeImageUrl ? '✅ Set' : '❌ Not set', 
                inline: true 
            },
            { 
                name: 'Rules Channel', 
                value: rulesChannel ? rulesChannel.toString() : 'Not set', 
                inline: true 
            },
            { 
                name: 'Roles Channel', 
                value: rolesChannel ? rolesChannel.toString() : 'Not set', 
                inline: true 
            },
            { 
                name: 'Intro Channel', 
                value: introChannel ? introChannel.toString() : 'Not set', 
                inline: true 
            },
            { 
                name: 'Main Channel', 
                value: mainChannel ? mainChannel.toString() : 'Not set', 
                inline: true 
            }
        )
        .setTimestamp();
    
    if (settings.welcomeImageUrl) {
        embed.setImage(settings.welcomeImageUrl);
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function handleChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    await updateGuildSettings(interaction.guild.id, {
        welcomeChannelId: channel.id
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Welcome Channel Updated')
                .setDescription(`Welcome messages will now be sent to ${channel}.`)
        ]
    });
}

async function handleMessage(interaction) {
    const message = interaction.options.getString('message');
    
    await updateGuildSettings(interaction.guild.id, {
        welcomeMessage: message
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Welcome Message Updated')
                .setDescription('The welcome message template has been updated.')
                .addFields({ name: 'New Message', value: `\`\`\`${message}\`\`\`` })
        ]
    });
}

async function handleToggle(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    
    await updateGuildSettings(interaction.guild.id, {
        welcomeEnabled: enabled
    });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(enabled ? config.colors.success : config.colors.warning)
                .setTitle('Welcome Messages ' + (enabled ? 'Enabled' : 'Disabled'))
                .setDescription(enabled 
                    ? 'Welcome messages will now be sent when new members join.'
                    : 'Welcome messages have been disabled.')
        ]
    });
}

async function handleTest(interaction, settings) {
    if (!settings.welcomeChannelId) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Channel Not Set')
                    .setDescription('Please set a welcome channel first using `/welcome channel`.')
            ],
            ephemeral: true
        });
    }
    
    const channel = interaction.guild.channels.cache.get(settings.welcomeChannelId);
    if (!channel) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Channel Not Found')
                    .setDescription('The configured welcome channel could not be found.')
            ],
            ephemeral: true
        });
    }
    
    // Get ordinal suffix
    const getOrdinalSuffix = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    // Build channel links
    const rulesChannel = settings.rulesChannelId ? `<#${settings.rulesChannelId}>` : '#rules';
    const rolesChannel = settings.rolesChannelId ? `<#${settings.rolesChannelId}>` : '#roles';
    const introChannel = settings.introChannelId ? `<#${settings.introChannelId}>` : '#introduction';
    const mainChannel = settings.mainChannelId ? `<#${settings.mainChannelId}>` : '#main';
    
    const memberCount = interaction.guild.memberCount;
    const ordinalCount = getOrdinalSuffix(memberCount);
    
    const welcomeDescription = `${interaction.user}\n\n` +
        `⭐ Read the ${rulesChannel} before chatting.\n` +
        `⭐ Get your ${rolesChannel} if you want.\n` +
        `⭐ Introduce yourself in ${introChannel}.\n\n` +
        `you are our **${ordinalCount}** member!\n\n` +
        `Done reading? Check out ${mainChannel}.`;
    
    const embed = new EmbedBuilder()
        .setColor('#ff69b4')
        .setAuthor({ name: '『 WELCOME TO SOFIA ISELLA 』', iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setDescription(welcomeDescription)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: 'Sofia Isella Fan Server | TEST MESSAGE', iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
    
    if (settings.welcomeImageUrl) {
        embed.setImage(settings.welcomeImageUrl);
    }
    
    await channel.send({ embeds: [embed] });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Test Message Sent')
                .setDescription(`A test welcome message has been sent to ${channel}.`)
        ],
        ephemeral: true
    });
}

async function handleRulesChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    await updateGuildSettings(interaction.guild.id, { rulesChannelId: channel.id });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Rules Channel Updated')
                .setDescription(`Rules channel set to ${channel}.`)
        ],
        ephemeral: true
    });
}

async function handleRolesChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    await updateGuildSettings(interaction.guild.id, { rolesChannelId: channel.id });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Roles Channel Updated')
                .setDescription(`Roles channel set to ${channel}.`)
        ],
        ephemeral: true
    });
}

async function handleIntroChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    await updateGuildSettings(interaction.guild.id, { introChannelId: channel.id });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Introduction Channel Updated')
                .setDescription(`Introduction channel set to ${channel}.`)
        ],
        ephemeral: true
    });
}

async function handleMainChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    await updateGuildSettings(interaction.guild.id, { mainChannelId: channel.id });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Main Channel Updated')
                .setDescription(`Main channel set to ${channel}.`)
        ],
        ephemeral: true
    });
}

async function handleImage(interaction) {
    const url = interaction.options.getString('url');
    
    if (url.toLowerCase() === 'none') {
        await updateGuildSettings(interaction.guild.id, { welcomeImageUrl: null });
        
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('Welcome Image Removed')
                    .setDescription('The welcome image has been removed.')
            ],
            ephemeral: true
        });
    }
    
    // Basic URL validation
    try {
        new URL(url);
    } catch {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Invalid URL')
                    .setDescription('Please provide a valid image URL.')
            ],
            ephemeral: true
        });
    }
    
    await updateGuildSettings(interaction.guild.id, { welcomeImageUrl: url });
    
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('Welcome Image Updated')
                .setDescription('The welcome image has been updated.')
                .setImage(url)
        ],
        ephemeral: true
    });
}
