const { Events, Collection } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            
            // Handle cooldowns
            if (!client.cooldowns.has(command.data.name)) {
                client.cooldowns.set(command.data.name, new Collection());
            }
            
            const now = Date.now();
            const timestamps = client.cooldowns.get(command.data.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;
            
            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                
                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1000);
                    return interaction.reply({
                        content: `Please wait, you can use this command again <t:${expiredTimestamp}:R>.`,
                        flags: 64 // Ephemeral
                    });
                }
            }
            
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);
                
                try {
                    const errorMessage = {
                        content: 'There was an error while executing this command.',
                        flags: 64 // Ephemeral
                    };
                    
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                } catch (replyError) {
                    // Interaction may have already been handled
                    console.error('Could not send error response:', replyError.message);
                }
            }
        }
        
        // Handle button interactions
        if (interaction.isButton()) {
            try {
                // Handle booster color buttons
                if (interaction.customId.startsWith('booster_color_')) {
                    const { handleBoosterColorButton } = require('./buttonHandlers/boosterColorHandler');
                    await handleBoosterColorButton(interaction);
                    return;
                }
                
                // Handle pagination buttons
                if (interaction.customId.includes('_page_')) {
                    // Pagination is handled within each command
                    return;
                }
            } catch (error) {
                console.error('Error handling button interaction:', error);
                
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'An error occurred while processing this action.',
                            flags: 64 // Ephemeral
                        });
                    }
                } catch (replyError) {
                    console.error('Could not send button error response:', replyError.message);
                }
            }
        }
        
        // Handle autocomplete
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command || !command.autocomplete) return;
            
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error('Error handling autocomplete:', error);
            }
        }
    }
};
