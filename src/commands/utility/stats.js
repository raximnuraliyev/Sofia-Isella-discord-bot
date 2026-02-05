const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { formatTimestamp } = require('../../utils/embedUtils');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View server or user statistics')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('View server statistics')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('View user statistics')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to check (leave empty for yourself)')
                        .setRequired(false)
                )
        ),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'server') {
            return handleServerStats(interaction);
        } else {
            return handleUserStats(interaction);
        }
    }
};

async function handleServerStats(interaction) {
    await interaction.deferReply();
    
    const guild = interaction.guild;
    
    // Get user stats from database
    const totalUsers = await User.countDocuments({ guildId: guild.id });
    const totalXP = await User.aggregate([
        { $match: { guildId: guild.id } },
        { $group: { _id: null, total: { $sum: '$totalXp' } } }
    ]);
    
    const topUser = await User.findOne({ guildId: guild.id }).sort({ totalXp: -1 });
    let topUserName = 'No one yet';
    if (topUser) {
        const member = await guild.members.fetch(topUser.odorId).catch(() => null);
        topUserName = member ? member.user.username : 'Unknown User';
    }
    
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${guild.name} Statistics`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: 'Members', value: `${guild.memberCount}`, inline: true },
            { name: 'Tracked Users', value: `${totalUsers}`, inline: true },
            { name: 'Total XP Earned', value: `${(totalXP[0]?.total || 0).toLocaleString()}`, inline: true },
            { name: 'Top Member', value: topUserName, inline: true },
            { name: 'Created', value: formatTimestamp(guild.createdAt, 'D'), inline: true },
            { name: 'Boost Level', value: `${guild.premiumTier}`, inline: true }
        )
        .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
}

async function handleUserStats(interaction) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    const user = await User.findOne({ 
        odorId: targetUser.id, 
        guildId: interaction.guild.id 
    });
    
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${targetUser.username}'s Statistics`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }));
    
    if (!user) {
        embed.setDescription('No activity data recorded yet.');
    } else {
        // Get rank
        const rank = await User.countDocuments({
            guildId: interaction.guild.id,
            totalXp: { $gt: user.totalXp }
        }) + 1;
        
        embed.addFields(
            { name: 'Level', value: `${user.level}`, inline: true },
            { name: 'Total XP', value: `${user.totalXp.toLocaleString()}`, inline: true },
            { name: 'Rank', value: `#${rank}`, inline: true },
            { name: 'Daily Games Played', value: `${user.dailyGamesPlayed}`, inline: true },
            { name: 'AI Interactions', value: `${user.aiInteractionCount}`, inline: true }
        );
        
        if (user.lastXpGain) {
            embed.addFields({ 
                name: 'Last Active', 
                value: formatTimestamp(user.lastXpGain, 'R'), 
                inline: true 
            });
        }
    }
    
    if (member) {
        embed.addFields({ 
            name: 'Joined Server', 
            value: formatTimestamp(member.joinedAt, 'D'), 
            inline: true 
        });
    }
    
    embed.addFields({ 
        name: 'Account Created', 
        value: formatTimestamp(targetUser.createdAt, 'D'), 
        inline: true 
    });
    
    embed.setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
}
