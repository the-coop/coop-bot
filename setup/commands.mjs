import { CHANNELS } from "coop-shared/config.mjs";
import AccessCodes from "coop-shared/services/access-codes.mjs";
import { Collection } from "discord.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


// https://discordjs.guide/creating-your-bot/command-handling.html#reading-command-files
export default async function setupCommands(client) {    
    // Start locally loading the commands.
    client.commands = new Collection();
    
    // Parse through the command files
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const commandsDir = path.join(__dirname, "../commands/");
    const commandFolders = fs.readdirSync(commandsDir,  { withFileTypes: true }).filter(de => de.isDirectory());
    commandFolders.map(async f => {
        const cmdFolderPath = commandsDir + '/' + f.name + '/';
        const commandFiles = fs.readdirSync(cmdFolderPath).filter(file => file.endsWith('.mjs'));

        for (const file of commandFiles) {
            // Dynamically import the command via path.
            const command = await import(`../commands/${f.name}/${file}`);
    
            // Register the command locally.
            client.commands.set(command.name, command);
        }
    });

    // Could also handle another kind of command here based on text.
    // µµ

    // Dynamically load and execute the command based on the interaction command name/key.
    client.on('interactionCreate', async interaction => {
        console.log(interaction);

        const infoChannel = interaction.channelId === CHANNELS.ABOUT.id;
        if (infoChannel && interaction.customId === 'login') {
            const code = await AccessCodes._createLink(interaction.user.id);
            const link = AccessCodes.link(code);
            return await interaction.reply({ content: link, ephemeral: true });
        }

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
