import * as dotenv from 'dotenv';
dotenv.config();

import { GatewayIntentBits, Client } from 'discord.js';
import Database from 'coop-shared/setup/database.mjs';

import { STATE, USERS } from '../coop.mjs';

import AlgoHelper from '../operations/minigames/medium/economy/blockchain/AlgoHelper.mjs';
import algosdk from 'algosdk';

import Items from 'coop-shared/services/items.mjs';

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
    


            
            // const publicKey = AlgoHelper.account().addr.publicKey;
            // const address = algosdk.encodeAddress(publicKey);
            // console.log('Address:', address);

            AlgoHelper.login();
            // await AlgoHelper.mint("Eli M", 'TEST_ELI_FACE', 'https://thecoop.group/items/metadata/TEST_ELI_FACE', 1000, 0);

            AlgoHelper.release('ZFKQVABUNUEEGY3WZSHUJL5Q7F3WKYZY4U7HOS7QFPJK6BIQ6OOGRIJ42Q', 730713744, 1);
            
            // Items.add('786671654721683517', 'GOLD_COIN', 2, 'testing export');

        });
    } catch(e) {
        console.error('Shallow bot error', e);
    }
};

shallowBot();
