const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { xpProgress, createProgressBar, xpForLevel } = require('../../utils/levelUtils');
const { getGuildSettings, levelRolesToObject } = require('../../utils/guildSettings');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your level or another user\'s level')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check (leave empty for yourself)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        const user = await User.findOne({ 
            odorId: targetUser.id, 
            guildId: interaction.guild.id 
        });
        
        if (!user) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.info)
                        .setDescription(`${targetUser.id === interaction.user.id ? 'You have' : `${targetUser} has`} not earned any XP yet.`)
                ],
                ephemeral: true
            });
        }
        
        const progress = xpProgress(user.totalXp);
        const progressBar = createProgressBar(progress.percentage, 15);
        const settings = await getGuildSettings(interaction.guild.id);
        const levelRoles = levelRolesToObject(settings.levelRoles);
        
        // Find next milestone
        const milestones = Object.keys(levelRoles).map(Number).sort((a, b) => a - b);
        const nextMilestone = milestones.find(m => m > user.level) || config.xp.maxLevel;
        
        // Calculate XP needed for next milestone
        let xpToNextMilestone = 0;
        for (let i = user.level + 1; i <= nextMilestone; i++) {
            xpToNextMilestone += xpForLevel(i);
        }
        xpToNextMilestone -= progress.current;
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setAuthor({ 
                name: targetUser.username, 
                iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
            })
            .addFields(
                { name: 'Level', value: `${user.level}`, inline: true },
                { name: 'Total XP', value: `${user.totalXp.toLocaleString()}`, inline: true },
                { name: 'Next Level', value: user.level >= config.xp.maxLevel ? 'Max Level' : `${user.level + 1}`, inline: true },
                { name: 'Progress', value: `${progressBar}\n${progress.current.toLocaleString()} / ${progress.required.toLocaleString()} XP (${progress.percentage}%)`, inline: false }
            )
            .setTimestamp();
        
        if (user.level < config.xp.maxLevel) {
            embed.addFields({
                name: 'Next Milestone',
                value: `Level ${nextMilestone} (${xpToNextMilestone.toLocaleString()} XP needed)`,
                inline: false
            });
        }
        
        if (targetMember) {
            embed.setThumbnail(targetMember.displayAvatarURL({ dynamic: true, size: 256 }));
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};
