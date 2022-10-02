import dotenv from 'dotenv';

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

import BOTS from 'coopshared/config/bots.mjs';

dotenv.config();

// Register the slash commands with the Discord rest API.
const rest = new REST({ version: '9' })
    .setToken(process.env.DISCORD_TOKEN);

try {
    console.log('Started refreshing application (/) commands.');

    // const appGuildCommands = await rest.get(Routes.applicationGuildCommands(BOTS.COOPER.id, process.env.GUILD_ID));
    const appCommands = await rest.get(Routes.applicationCommands(BOTS.COOPER.id));

    console.log(appGuildCommands);
    console.log(appCommands);
    
} catch (error) {
    console.error(error);
}
