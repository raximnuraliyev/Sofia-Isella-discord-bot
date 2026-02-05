const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isModerator, isAdmin } = require('../../utils/guildSettings');
const { version } = require('../../../package.json');
const config = require('../../config/config');

// Command definitions with categories and permission levels
const COMMANDS = {
    user: [
        {
            category: '🎮 Fun & Community',
            commands: [
                { name: '/daily', description: 'Play the daily Sofia-themed game and earn XP rewards' },
                { name: '/sofia [message]', description: 'Have a conversation with Sofia - she responds as herself!' },
                { name: '/booster-colors list', description: 'View all available booster color roles' }
            ]
        },
        {
            category: '📊 Leveling',
            commands: [
                { name: '/level [user]', description: 'Check your level, XP, and progress or view another user\'s stats' },
                { name: '/leaderboard', description: 'View the server XP leaderboard with rankings' }
            ]
        },
        {
            category: '🔧 Utility',
            commands: [
                { name: '/help', description: 'View this help menu with all available commands' },
                { name: '/ping', description: 'Check the bot\'s response time and latency' },
                { name: '/stats', description: 'View bot statistics and server information' },
                { name: '/issues report', description: 'Report a bug or issue with the bot' },
                { name: '/issues my-issues', description: 'View your previously reported issues' }
            ]
        }
    ],
    moderator: [
        {
            category: '🛡️ Moderation',
            commands: [
                { name: '/warn [user] [reason]', description: 'Issue a warning to a user that gets recorded' },
                { name: '/warnings [user]', description: 'View all warnings for a specific user' },
                { name: '/unwarn [warning-id]', description: 'Remove a specific warning from a user' },
                { name: '/mute [user] [duration] [reason]', description: 'Timeout a user for a specified duration' },
                { name: '/unmute [user] [reason]', description: 'Remove timeout from a muted user' },
                { name: '/ban [user] [reason]', description: 'Permanently ban a user from the server' },
                { name: '/unban [user-id] [reason]', description: 'Unban a previously banned user by their ID' }
            ]
        },
        {
            category: '🚫 Content Filter',
            commands: [
                { name: '/banned-words add [word]', description: 'Add a word to the server\'s banned words list' },
                { name: '/banned-words remove [word]', description: 'Remove a word from the banned words list' },
                { name: '/banned-words list', description: 'View all server-specific banned words' }
            ]
        },
        {
            category: '⚙️ Configuration',
            commands: [
                { name: '/welcome view', description: 'View current welcome message settings' },
                { name: '/welcome channel [channel]', description: 'Set the channel for welcome messages' },
                { name: '/welcome toggle [enabled]', description: 'Enable or disable welcome messages' },
                { name: '/welcome test', description: 'Send a test welcome message' },
                { name: '/welcome rules-channel [channel]', description: 'Set the rules channel link in welcome' },
                { name: '/welcome roles-channel [channel]', description: 'Set the roles channel link in welcome' },
                { name: '/welcome intro-channel [channel]', description: 'Set the intro channel link in welcome' },
                { name: '/welcome main-channel [channel]', description: 'Set the main channel link in welcome' },
                { name: '/welcome image [url]', description: 'Set or remove the welcome message image' },
                { name: '/xp-settings', description: 'Configure XP gain rates and cooldowns' },
                { name: '/issues list [status]', description: 'View all reported issues with filtering' },
                { name: '/issues update [id] [status]', description: 'Update the status of a reported issue' }
            ]
        }
    ],
    admin: [
        {
            category: '👑 Administration',
            commands: [
                { name: '/settings view', description: 'View all bot configuration settings' },
                { name: '/settings mod-role [role]', description: 'Set which role has moderator permissions' },
                { name: '/settings admin-role [role]', description: 'Set which role has admin permissions' },
                { name: '/settings log-channel [channel]', description: 'Set the channel for mod action logs' },
                { name: '/settings booster-role [role]', description: 'Set the server booster role' },
                { name: '/settings booster-channel [channel]', description: 'Set the booster colors selection channel' }
            ]
        },
        {
            category: '🎨 Booster Colors',
            commands: [
                { name: '/booster-colors setup', description: 'Send the color selection message with buttons' },
                { name: '/booster-colors add-role [role]', description: 'Add a new color role option' },
                { name: '/booster-colors remove-role [role]', description: 'Remove a color role option' }
            ]
        }
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all available commands'),
    
    async execute(interaction) {
        const isMod = await isModerator(interaction.member);
        const isAdm = await isAdmin(interaction.member);
        
        // Determine which categories to show
        let categories = [...COMMANDS.user];
        
        if (isMod) {
            categories = [...categories, ...COMMANDS.moderator];
        }
        
        if (isAdm) {
            categories = [...categories, ...COMMANDS.admin];
        }
        
        // Pagination setup
        let currentPage = 0;
        const totalPages = categories.length;
        
        const generateEmbed = (page) => {
            const category = categories[page];
            
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setAuthor({ 
                    name: 'Sofia Isella Bot Help', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTitle(category.category)
                .setDescription(category.commands.map(cmd => 
                    `**${cmd.name}**\n┗ ${cmd.description}`
                ).join('\n\n'))
                .setFooter({ 
                    text: `Page ${page + 1} of ${totalPages} | Version ${version} | ${isAdm ? '👑 Admin' : isMod ? '🛡️ Mod' : '👤 User'} View` 
                })
                .setTimestamp();
            
            return embed;
        };
        
        const generateButtons = (page) => {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_first')
                        .setLabel('⏮')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('help_prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('help_page')
                        .setLabel(`${page + 1}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('help_next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('help_last')
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
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'You cannot use these buttons.', ephemeral: true });
            }
            
            if (i.customId === 'help_first') currentPage = 0;
            else if (i.customId === 'help_prev') currentPage = Math.max(0, currentPage - 1);
            else if (i.customId === 'help_next') currentPage = Math.min(totalPages - 1, currentPage + 1);
            else if (i.customId === 'help_last') currentPage = totalPages - 1;
            
            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
        });
        
        collector.on('end', async () => {
            await interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};
