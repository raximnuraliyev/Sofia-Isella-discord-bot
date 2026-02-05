const { Events, EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/guildSettings');
const config = require('../config/config');

// Sofia Isella welcome image
const WELCOME_IMAGE = 'https://i.imgur.com/JxPZQHk.png';

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            const settings = await getGuildSettings(member.guild.id);
            
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
            
            const embed = new EmbedBuilder()
                .setColor(0x5865F2) // Discord blurple
                .setTitle('WELCOME TO SOFIA ISELLA')
                .setDescription(
                    `⭐ ${rulesChannel}\n` +
                    `⭐ ${rolesChannel}\n` +
                    `⭐ ${introChannel}\n\n` +
                    `you are our **${count}${ordinal}** member!`
                )
                .setImage(WELCOME_IMAGE)
                .setFooter({ text: `Done reading? Check out ${mainChannel.replace(/<|>|#/g, '')}` });
            
            await channel.send({ 
                content: `${member}`,
                embeds: [embed] 
            });
        } catch (error) {
            console.error('Error in welcome event:', error);
        }
    }
};

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
