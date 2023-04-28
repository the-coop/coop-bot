import * as dotenv from 'dotenv';
dotenv.config();

import Database from 'coop-shared/setup/database.mjs';
import { STATE } from './coop.mjs';

import client from './setup/client.mjs';
import registerLogging from './setup/logging.mjs';

import eventsManifest from './operations/manifest.mjs';


export default async function bot() {
    console.log('Trying to start bot');

    // Connect to PostGres Database and attach event/error handlers.
    await Database.connect();

    // Globalise the created client (extended Discordjs).
    const botClient = STATE.CLIENT = await client();

    // Indicate to initialisation backend logging.
    console.log('Starting bot on guild id: ' + process.env.GUILD_ID);

    // Login to Discord with the bot.
    await botClient.login(process.env.DISCORD_TOKEN);

    // Register community events.
    eventsManifest(botClient);
    
    // Register logging, debugging, errors, etc.
    registerLogging(botClient);

    // Set activity.
    botClient.user.setActivity(`We need /help`, { type: 'WATCHING' });
};

bot();