import fs from 'fs';
import path from 'path';
import { Collection } from "discord.js";

// https://discordjs.guide/creating-your-bot/command-handling.html#reading-command-files
export default async function setupCommands(client) {    
    // Start locally loading the commands.
    client.commands = new Collection();

    // Resolve commands path.
    const pathParts = import.meta.url.split('/');
    const trimOne = pathParts.slice(2, pathParts.length);
    const trimTwo = trimOne.slice(0, trimOne.length - 3);
    const commandsDir = trimTwo.join('/') + '/commands';
    
    // Parse through the command files
    const commandFolders = fs.readdirSync(commandsDir,  { withFileTypes: true }).filter(de => de.isDirectory());
    commandFolders.map(async f => {
        const cmdFolderPath = commandsDir + '/' + f.name + '/';
        const commandFiles = fs.readdirSync(cmdFolderPath).filter(file => file.endsWith('.mjs'));

        for (const file of commandFiles) {
            // Dynamically import the command via path.
            const command = await import(`../../commands/${f.name}/${file}`);
    
            // Register the command locally.
            client.commands.set(command.name, command);
        }
    });

    // Could also handle another kind of command here based on text.
    // µµ

    // Dynamically load and execute the command based on the interaction command name/key.
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);
    
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    });
}
