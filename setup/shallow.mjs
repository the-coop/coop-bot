import * as dotenv from 'dotenv';
dotenv.config();

import _ from 'lodash';
import { GatewayIntentBits, Client, time } from 'discord.js';
import Database from 'coop-shared/setup/database.mjs';
import { CHANNELS, MESSAGES, SERVER, STATE, TIME, USERS } from '../coop.mjs';
import Items from 'coop-shared/services/items.mjs';
import ElectionHelper from '../operations/members/hierarchy/election/electionHelper.mjs';
import CompetitionHelper, { COMPETITION_DUR } from '../operations/social/competitionHelper.mjs';
import EventsHelper from '../operations/eventsHelper.mjs';
import EggHuntMinigame from '../operations/minigames/small/egghunt.mjs';
import SuggestionsHelper from '../operations/activity/suggestions/suggestionsHelper.mjs';
import ReactionHelper from '../operations/activity/messages/reactionHelper.mjs';
import SacrificeHelper from '../operations/members/redemption/sacrificeHelper.mjs';


// Commonly useful.
// const listenReactions = (fn) => COOP.STATE.CLIENT.on('messageReactionAdd', fn);
// const listenChannelUpdates = (fn) => COOP.STATE.CLIENT.on('channelUpdate', fn);
// const listenMessages = (fn) => COOP.STATE.CLIENT.on('messageCreate', fn);
// const listenVoiceState = (fn) => COOP.STATE.CLIENT.on('voiceStateUpdate', fn);
const listenDeleteions = (fn) => STATE.CLIENT.on('messageDelete', fn);

const shallowBot = async () => {
    console.log('Starting shallow bot');

    // Instantiate a CommandoJS "client".
    STATE.CLIENT = new Client({ 
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
    await STATE.CLIENT.login(process.env.DISCORD_TOKEN);

    // Common checks:
    // COOP.STATE.CLIENT.on('ready', () => SERVER.checkMissingChannels());
    // COOP.STATE.CLIENT.on('ready', () => SERVER.checkMissingRoles());

    // setupCommands(COOP.STATE.CLIENT);

    STATE.CLIENT.on('ready', async () => {
        console.log('Shallow bot is ready');


        // TODO: Test sacrifice mechanism
        // SacrificeHelper.random();

        // TODO: Load/track sacrifices?

        // TODO: Intercept sacrifice ended?
    });
};

shallowBot();
