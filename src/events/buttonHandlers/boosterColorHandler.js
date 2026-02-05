const { EmbedBuilder } = require('discord.js');
const { getGuildSettings, isBooster } = require('../../utils/guildSettings');
const GuildSettings = require('../../models/GuildSettings');
const config = require('../../config/config');

/**
 * Handle booster color button interactions
 */
async function handleBoosterColorButton(interaction) {
    const roleId = interaction.customId.replace('booster_color_', '');
    const member = interaction.member;
    const settings = await getGuildSettings(interaction.guild.id);
    
    // Check if user is a booster
    if (!await isBooster(member)) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Booster Exclusive')
                    .setDescription('This feature is exclusive to Server Boosters. Boost the server to unlock custom color roles.')
            ],
            ephemeral: true
        });
    }
    
    // Check if the role is a valid booster color role
    if (!settings.boosterColorRoles.includes(roleId)) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Invalid Role')
                    .setDescription('This color role is no longer available.')
            ],
            ephemeral: true
        });
    }
    
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Role Not Found')
                    .setDescription('This color role could not be found. Please contact a moderator.')
            ],
            ephemeral: true
        });
    }
    
    // Check if user already has this role
    if (member.roles.cache.has(roleId)) {
        // Remove the role
        await member.roles.remove(role);
        
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('Color Removed')
                    .setDescription(`The **${role.name}** color has been removed from your profile.`)
            ],
            ephemeral: true
        });
    }
    
    // Remove any other booster color roles first
    const currentColorRoles = member.roles.cache.filter(r => 
        settings.boosterColorRoles.includes(r.id) && r.id !== roleId
    );
    
    for (const [, colorRole] of currentColorRoles) {
        await member.roles.remove(colorRole);
    }
    
    // Add the new color role
    await member.roles.add(role);
    
    return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(role.color || config.colors.success)
                .setTitle('Color Applied')
                .setDescription(`The **${role.name}** color has been applied to your profile.`)
        ],
        ephemeral: true
    });
}

module.exports = { handleBoosterColorButton };
