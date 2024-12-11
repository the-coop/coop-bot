import fs from 'fs';
import path from 'path';
import { REST } from 'discord.js';
import { Routes } from 'discord-api-types/v9';

import BOTS from 'coop-shared/config/bots.mjs';

import * as dotenv from 'dotenv';
dotenv.config();


const deploy = async () => {
    const commands = [];
    
    // Parse throuh the command files
    const commandsDir = path.resolve('./commands/');
    const commandFolders = fs.readdirSync(commandsDir,  { withFileTypes: true }).filter(de => de.isDirectory());
    Promise.all(commandFolders.map(async f => {
        const cmdFolderPath = commandsDir + '/' + f.name + '/';
        const commandFiles = fs.readdirSync(cmdFolderPath).filter(file => file.endsWith('.mjs'));
    
        for (const file of commandFiles) {
            // Dynamically import the command via path.
            const command = await import(`../../commands/${f.name}/${file}`);
    
            // Add to meta for slash command registration.
            commands.push(command.data.toJSON());
        }
    }))
        .then(async () => {
            // Register the slash commands with the Discord rest API.
            const rest = new REST({ version: '9' })
                .setToken(process.env.DISCORD_TOKEN);
            
            try {
                console.log('Started refreshing application (/) commands.');
            
                // await rest.put(
                //     Routes.applicationGuildCommands(BOTS.COOPER.id, process.env.GUILD_ID),
                //     { body: commands },
                // );
            
                await rest.put(
                    Routes.applicationCommands(BOTS.COOPER.id),
                    { body: commands },
                );
                
            } catch (error) {
                console.error(error);
            }
        });
}

deploy();