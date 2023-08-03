import * as dotenv from 'dotenv';
dotenv.config();

import _ from 'lodash';
import { GatewayIntentBits, Client } from 'discord.js';
import Database from 'coop-shared/setup/database.mjs';
import COOP, { CHANNELS, CHICKEN, ITEMS, MESSAGES, POINTS, REACTIONS, ROLES, SERVER, STATE, TIME, USERS } from '../coop.mjs';


// Commonly useful.
const listenReactions = (fn) => COOP.STATE.CLIENT.on('messageReactionAdd', fn);
const listenChannelUpdates = (fn) => COOP.STATE.CLIENT.on('channelUpdate', fn);
const listenMessages = (fn) => COOP.STATE.CLIENT.on('messageCreate', fn);
const listenVoiceState = (fn) => COOP.STATE.CLIENT.on('voiceStateUpdate', fn);



const shallowBot = async () => {
    console.log('Starting shallow bot');

    // Instantiate a CommandoJS "client".
    COOP.STATE.CLIENT = new Client({ 
        owner: '786671654721683517',
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
    await COOP.STATE.CLIENT.login(process.env.DISCORD_TOKEN);

    // Common checks:
    // COOP.STATE.CLIENT.on('ready', () => ServerHelper.checkMissingChannels());
    // COOP.STATE.CLIENT.on('ready', () => SERVER.checkMissingRoles());

    // setupCommands(COOP.STATE.CLIENT);

    COOP.STATE.CLIENT.on('ready', async () => {
        console.log('Shallow bot is ready');

        // const agency = CHANNELS._get('1097911978560856165');
        // console.log(agency.name, agency.id);

        // TODO: Check if agency role still exists.
        // TODO: Restrict permissions to AGENCY role

        // const txsPrevDay = await CHICKEN.getTransactionsPreviousDay();
        // const summarisedTxs = ActivityHelper.summariseTransactions(txsPrevDay);

        // Added acorn
        // Get them into the game
        // TODO: Acorn spawning trees

        
        
        
        const talk = await COOP.CHANNELS._getCode('TALK');
        setInterval(async () => {
            const dropMsg = await COOP.USABLE.drop(talk, 'CHESTNUT');
            // setTimeout(() => dropMsg.edit('Stolen by fox 🦊'), 1500);
            // TODO: Remove reactions
        }, 30000);

        // talk.send('🦊')
        

    });
};

shallowBot();
