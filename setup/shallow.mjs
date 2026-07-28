import * as dotenv from 'dotenv';
dotenv.config();

import { GatewayIntentBits, Client } from 'discord.js';
import Database from 'coop-shared/setup/database.mjs';

import { STATE, USERS, SERVER } from '../coop.mjs';

import AlgoHelper from '../operations/minigames/medium/economy/blockchain/AlgoHelper.mjs';
import algosdk from 'algosdk';

import Items from 'coop-shared/services/items.mjs';
import EventsHelper from '../operations/eventsHelper.mjs';
import FoxHuntMinigame from '../operations/minigames/small/foxhunt.mjs';
import CoopdleMinigame from '../operations/minigames/small/coopdle.mjs';
import CoopdleStore, { STATUSES } from '../operations/minigames/small/coopdle/coopdleStore.mjs';
import { ITEMS } from 'coop-shared/config.mjs';

// Commonly useful.
// const listenReactions = (fn) => STATE.CLIENT.on('messageReactionAdd', fn);
// const listenChannelUpdates = (fn) => STATE.CLIENT.on('channelUpdate', fn);
// const listenMessages = (fn) => STATE.CLIENT.on('messageCreate', fn);
// const listenVoiceState = (fn) => STATE.CLIENT.on('voiceStateUpdate', fn);
// const listenDeletions = (fn) => STATE.CLIENT.on('messageDelete', fn);
const listenInteractions = (fn) => STATE.CLIENT.on('interactionCreate', fn);

const shallowBot = async () => {
    try {
        console.log('Starting shallow bot');

        // Instantiate a Discord.js "client".
        STATE.CLIENT = new Client({ 
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildVoiceStates
            ]
        });
    
        // Connect to Postgres database.
        await Database.connect();

        // Login, then wait for the bot to be fully online before testing.
        await STATE.CLIENT.login(process.env.DISCORD_TOKEN);

        // Common checks:
        // STATE.CLIENT.on('ready', () => SERVER.checkMissingChannels());
        // STATE.CLIENT.on('ready', () => SERVER.checkMissingRoles());
    
        // setupCommands(STATE.CLIENT);
    

        STATE.CLIENT.on('ready', async () => {
            console.log('Shallow bot is ready');
    
            // FoxHuntMinigame.run();

            // SERVER.checkMissingChannels();

            // CHANNELS._hide(CHANNELS.config.SPOTLIGHT.id);

            // Drop a Coopdle board by hand, leaving the daily schedule alone.
            //
            // run() only posts a board. The schedule lives in the coopdle_day/coopdle_due
            // chicken config and is read and written by tick() alone, so calling tick()
            // here instead would burn today's due time and drop the real board early.
            //
            // Knock-on to be aware of: only one board is live at a time, so if this one is
            // still unsolved when today's drop comes due, tick() clears the due time, finds
            // a board already active and the community silently skips a day. Spawn manually
            // when today's board has already been played, or expect to lose it.

            // A board that crashed mid-game leaves its row PLAYING, and expire() will not
            // touch it until it is LIFETIME_SECS old, so run() refuses to drop a new one.
            // Close the stale board out by hand to clear the field.
            const live = await CoopdleStore.active();
            if (live) {
                await CoopdleStore.finish(live.id, { status: STATUSES.EXPIRED });
                await CoopdleStore.clearGuesses(live.id);
                console.log(`Force closed stuck Coopdle #${live.id}, the word was ${live.answer.toUpperCase()}.`);
            }

            const dropped = await CoopdleMinigame.run();
            console.log(dropped ? 'Dropped a Coopdle board.' : 'No board dropped.');

            // const chan = await CHANNELS.fetch('1521886323953107116');
            // console.log(chan);

            //   name: 'pics丨📸',
            // chan.setName('library丨📚');

            // const test = USERS._get('1328056970111881217');
            // console.log(test);

            // await EventsHelper.create('spotlight');
            
            // const publicKey = AlgoHelper.account().addr.publicKey;
            // const address = algosdk.encodeAddress(publicKey);
            // console.log('Address:', address);

            // AlgoHelper.login();
            // await AlgoHelper.mint("Eli M", 'TEST_ELI_FACE', 'https://thecoop.group/items/metadata/TEST_ELI_FACE', 1000, 0);

            // AlgoHelper.release('ZFKQVABUNUEEGY3WZSHUJL5Q7F3WKYZY4U7HOS7QFPJK6BIQ6OOGRIJ42Q', 730713744, 1);
            
            // Items.add('786671654721683517', 'GOLD_COIN', 2, 'testing export');

        });
    } catch(e) {
        console.error('Shallow bot error', e);
    }
};

shallowBot();
