const { Events, EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/guildSettings');
const config = require('../config/config');

// Default welcome role ID
const DEFAULT_WELCOME_ROLE_ID = '1376659696311730207';

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            const settings = await getGuildSettings(member.guild.id);
            
            // Auto-assign welcome role
            await assignWelcomeRole(member, settings);
            
            // Send welcome message
            await sendWelcomeMessage(member, settings);
        } catch (error) {
            console.error('Error in welcome event:', error);
        }
    }
};

/**
 * Assign the welcome role to new members
 */
async function assignWelcomeRole(member, settings) {
    try {
        // Use configured role or default
        const welcomeRoleId = settings.welcomeRoleId || DEFAULT_WELCOME_ROLE_ID;
        const role = member.guild.roles.cache.get(welcomeRoleId);
        
        if (role && !member.roles.cache.has(welcomeRoleId)) {
            await member.roles.add(role, 'Auto-assigned welcome role');
            console.log(`Assigned welcome role to ${member.user.tag}`);
        }
    } catch (error) {
        console.error(`Failed to assign welcome role to ${member.user.tag}:`, error);
    }
}

/**
 * Send welcome message to channel
 */
async function sendWelcomeMessage(member, settings) {
    if (!settings.welcomeEnabled || !settings.welcomeChannelId) {
        return;
    }
    
    const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
    if (!channel) return;
    
    // Get channel links
    const rulesChannel = settings.rulesChannelId 
        ? `<#${settings.rulesChannelId}>` 
        : '#rules';
    const rolesChannel = settings.rolesChannelId 
        ? `<#${settings.rolesChannelId}>` 
        : '#roles';
    const introChannel = settings.introChannelId 
        ? `<#${settings.introChannelId}>` 
        : '#intro';
    const mainChannel = settings.mainChannelId 
        ? `<#${settings.mainChannelId}>` 
        : '#main';
    
    // Format member count with ordinal suffix
    const count = member.guild.memberCount;
    const ordinal = getOrdinalSuffix(count);
    
    const welcomeDescription = `${member}\n\n` +
        `⭐ Read the ${rulesChannel} before chatting.\n` +
        `⭐ Get your ${rolesChannel} if you want.\n` +
        `⭐ Introduce yourself in ${introChannel}.\n\n` +
        `you are our **${count}${ordinal}** member!\n\n` +
        `Done reading? Check out ${mainChannel}.`;
    
    const embed = new EmbedBuilder()
        .setColor('#ff69b4')
        .setAuthor({ 
            name: '『 WELCOME TO SOFIA ISELLA 』', 
            iconURL: member.guild.iconURL({ dynamic: true }) 
        })
        .setDescription(welcomeDescription)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ 
            text: 'Sofia Isella Fan Server', 
            iconURL: member.guild.iconURL({ dynamic: true }) 
        })
        .setTimestamp();
    
    // Add welcome image if configured
    if (settings.welcomeImageUrl) {
        embed.setImage(settings.welcomeImageUrl);
    }
    
    await channel.send({ embeds: [embed] });
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
