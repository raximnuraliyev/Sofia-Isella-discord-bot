const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');
const { randomXp } = require('../../utils/levelUtils');
const { formatDuration } = require('../../utils/embedUtils');
const config = require('../../config/config');

// Sofia-themed daily game content
const GAME_PROMPTS = [
    {
        type: 'lyric_complete',
        question: 'Complete the thought: "In the quiet of the evening..."',
        options: [
            { text: '...the stars begin their dance', correct: true },
            { text: '...the noise grows louder', correct: false },
            { text: '...everything speeds up', correct: false },
            { text: '...the chaos returns', correct: false }
        ]
    },
    {
        type: 'symbolic_choice',
        question: 'You find a letter from your past self. What do you do?',
        options: [
            { text: 'Read it slowly, savoring each word', correct: true, xpBonus: 10 },
            { text: 'Put it away for another day', correct: true, xpBonus: 5 },
            { text: 'Share it with someone close', correct: true, xpBonus: 8 },
            { text: 'Let it remain unopened', correct: true, xpBonus: 3 }
        ]
    },
    {
        type: 'reflection',
        question: 'What draws you most to music?',
        options: [
            { text: 'The way it captures emotions words cannot', correct: true, xpBonus: 10 },
            { text: 'The memories it holds', correct: true, xpBonus: 8 },
            { text: 'The way it connects strangers', correct: true, xpBonus: 7 },
            { text: 'The escape it provides', correct: true, xpBonus: 6 }
        ]
    },
    {
        type: 'aesthetic',
        question: 'Which image speaks to you most today?',
        options: [
            { text: 'Morning light through a window', correct: true, xpBonus: 8 },
            { text: 'Rain on a quiet street', correct: true, xpBonus: 9 },
            { text: 'Stars reflected in still water', correct: true, xpBonus: 10 },
            { text: 'An empty room with soft music playing', correct: true, xpBonus: 7 }
        ]
    },
    {
        type: 'poetic',
        question: 'If your heart were a season, which would it be right now?',
        options: [
            { text: 'Spring - full of new beginnings', correct: true, xpBonus: 8 },
            { text: 'Summer - warm and open', correct: true, xpBonus: 7 },
            { text: 'Autumn - reflective and changing', correct: true, xpBonus: 9 },
            { text: 'Winter - quiet and introspective', correct: true, xpBonus: 10 }
        ]
    },
    {
        type: 'creative',
        question: 'You have one hour of complete solitude. How do you spend it?',
        options: [
            { text: 'Writing thoughts in a journal', correct: true, xpBonus: 9 },
            { text: 'Listening to music with eyes closed', correct: true, xpBonus: 10 },
            { text: 'Walking somewhere beautiful', correct: true, xpBonus: 8 },
            { text: 'Creating something with your hands', correct: true, xpBonus: 7 }
        ]
    },
    {
        type: 'wisdom',
        question: 'What matters most in a meaningful conversation?',
        options: [
            { text: 'The pauses between words', correct: true, xpBonus: 10 },
            { text: 'The honesty shared', correct: true, xpBonus: 9 },
            { text: 'The feeling of being understood', correct: true, xpBonus: 8 },
            { text: 'The questions asked', correct: true, xpBonus: 7 }
        ]
    },
    {
        type: 'dream',
        question: 'In your dreams, you often find yourself...',
        options: [
            { text: 'Flying above familiar places', correct: true, xpBonus: 7 },
            { text: 'Searching for something important', correct: true, xpBonus: 8 },
            { text: 'In conversations with people you miss', correct: true, xpBonus: 9 },
            { text: 'In places that feel like home but look different', correct: true, xpBonus: 10 }
        ]
    }
];

// Responses based on choices
const RESPONSE_MESSAGES = {
    lyric_complete: [
        'You have a poet\'s heart. The stars are always dancing for those who look up.',
        'Every evening holds a quiet magic for those who listen.'
    ],
    symbolic_choice: [
        'The past has beautiful things to teach us, when we\'re ready to listen.',
        'Letters to ourselves are conversations across time.'
    ],
    reflection: [
        'Music is the language of the soul. It speaks what words cannot.',
        'We all find ourselves in melodies, in different ways.'
    ],
    aesthetic: [
        'Beauty lives in quiet moments. You see it too.',
        'The world is full of small wonders for attentive eyes.'
    ],
    poetic: [
        'Your heart knows its own season. Trust its rhythm.',
        'Every season of the heart has its own beauty.'
    ],
    creative: [
        'Solitude is where we find ourselves again.',
        'Time alone is never truly empty for a creative soul.'
    ],
    wisdom: [
        'Real connection is built in the spaces between words.',
        'The deepest conversations leave us changed.'
    ],
    dream: [
        'Dreams are letters from our deeper selves.',
        'In sleep, we visit the landscapes of our hearts.'
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Play the daily Sofia-themed game and earn XP'),
    
    cooldown: 5,
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        // Get user data
        let user = await User.findOne({ odorId: userId, guildId: guildId });
        
        if (!user) {
            user = new User({ odorId: userId, guildId: guildId });
        }
        
        // Check cooldown (24 hours per user)
        if (user.lastDailyGame) {
            const timeSinceLastGame = Date.now() - user.lastDailyGame.getTime();
            const cooldownRemaining = config.dailyGame.cooldown - timeSinceLastGame;
            
            if (cooldownRemaining > 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.colors.info)
                            .setTitle('Daily Game')
                            .setDescription(`You\'ve already played today.\n\nCome back in **${formatDuration(cooldownRemaining)}** to play again.`)
                    ],
                    ephemeral: true
                });
            }
        }
        
        // Select random prompt
        const prompt = GAME_PROMPTS[Math.floor(Math.random() * GAME_PROMPTS.length)];
        
        // Shuffle options
        const shuffledOptions = [...prompt.options].sort(() => Math.random() - 0.5);
        
        // Create buttons
        const row = new ActionRowBuilder();
        
        shuffledOptions.forEach((option, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`daily_${index}`)
                    .setLabel(option.text.substring(0, 80)) // Button label limit
                    .setStyle(ButtonStyle.Secondary)
            );
        });
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('Daily Reflection')
            .setDescription(prompt.question)
            .setFooter({ text: 'Choose the answer that resonates with you' });
        
        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });
        
        // Create collector
        const collector = response.createMessageComponentCollector({
            time: 60000 // 1 minute to answer
        });
        
        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ 
                    content: 'This is not your game.', 
                    ephemeral: true 
                });
            }
            
            collector.stop('answered');
            
            const selectedIndex = parseInt(i.customId.replace('daily_', ''));
            const selectedOption = shuffledOptions[selectedIndex];
            
            // Calculate XP reward
            const baseXp = randomXp(config.dailyGame.xpReward.min, config.dailyGame.xpReward.max);
            const bonusXp = selectedOption.xpBonus || 0;
            const totalXp = baseXp + bonusXp;
            
            // Update user
            user.totalXp += totalXp;
            user.lastDailyGame = new Date();
            user.dailyGamesPlayed += 1;
            await user.save();
            
            // Get response message
            const responseMessages = RESPONSE_MESSAGES[prompt.type] || ['Thank you for sharing.'];
            const responseMessage = responseMessages[Math.floor(Math.random() * responseMessages.length)];
            
            // Disable buttons
            const disabledRow = new ActionRowBuilder();
            shuffledOptions.forEach((option, index) => {
                disabledRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`daily_${index}`)
                        .setLabel(option.text.substring(0, 80))
                        .setStyle(index === selectedIndex ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            });
            
            const resultEmbed = new EmbedBuilder()
                .setColor(config.colors.levelUp)
                .setTitle('Daily Reflection')
                .setDescription(`**Your choice:** ${selectedOption.text}\n\n*${responseMessage}*`)
                .addFields(
                    { name: 'XP Earned', value: `+${totalXp} XP`, inline: true },
                    { name: 'Games Played', value: `${user.dailyGamesPlayed}`, inline: true }
                )
                .setFooter({ text: 'Come back tomorrow for another reflection' })
                .setTimestamp();
            
            await i.update({
                embeds: [resultEmbed],
                components: [disabledRow]
            });
        });
        
        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('Daily Reflection')
                    .setDescription('Time has passed... the moment for reflection has faded.\n\nYour daily game is still available. Try again with `/daily`.');
                
                const disabledRow = new ActionRowBuilder();
                shuffledOptions.forEach((option, index) => {
                    disabledRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`daily_${index}`)
                            .setLabel(option.text.substring(0, 80))
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                });
                
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [disabledRow]
                }).catch(() => {});
            }
        });
    }
};
