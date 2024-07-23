import * as dotenv from 'dotenv';
dotenv.config();

import _ from 'lodash';
import { GatewayIntentBits, Client, time } from 'discord.js';
import Database from 'coop-shared/setup/database.mjs';
import { SERVER, STATE, TIME } from '../coop.mjs';
import Items from 'coop-shared/services/items.mjs';
import ElectionHelper from '../operations/members/hierarchy/election/electionHelper.mjs';
import CompetitionHelper, { COMPETITION_DUR } from '../operations/social/competitionHelper.mjs';


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
    
    // COOP.STATE.CLIENT.on("voiceStateUpdate", (prev, curr) => {
    //     const channel = curr?.channel || null;
    //     console.log(channel.members);
    // });

    STATE.CLIENT.on('ready', async () => {
        console.log('Shallow bot is ready');

        // listenDeleteions(ev => console.log(ev));

        // TODO: Why hasn't art competition ended?

        // TODO: Deleted entries handling?

        // TODO: Add competition ready message to general


        // const compInfoMsg = await MESSAGES.getByLink(comp.message_link);
        // CompetitionHelper.track();
        // CompetitionHelper.unsetEntryByMessageID('1262180844823642223');

        // CompetitionHelper.setEntryMessageID(49, '1262180844823642223');

        // 1262180844823642223

        // 1262180844823642223

        // // Time reference ms.
        // const now = TIME._secs();

        // Load all competitions.
        // const now = TIME._secs();
        // const artComp = await CompetitionHelper.get('art_competition');
        // const compLastOccurred = parseInt(artComp.last_occurred);
        // const hasExpired = now - compLastOccurred > COMPETITION_DUR;

        // console.log(artComp);
        // console.log(compLastOccurred);
        // console.log(hasExpired);

        // art_competition

        // // Initial count of running competitions.
        // let numRunning = competitions.reduce(comp => comp.active ? 1 : 0, 0);

        // Check if any of the competitions need starting/overdue.
        // competitions.map(async comp => {
        //     // Parse the last occurred time into an integer.
        //     const compLastOccurred = parseInt(comp.last_occurred);

        //     const test = new Date(compLastOccurred * 1000);
        //     console.log(test);

        //     // Check if within registration period.
        //     const isRegistrationPeriod = compLastOccurred + 3600 * 24 <= now;
            
        //     console.log(comp, isRegistrationPeriod);
        // });

        // console.log(competitions);


        // await CompetitionHelper.setMessageLink('art_competition', 'https://discordapp.com/channels/723660447508725802/845603527836303380/1258462660660559922');

        // comp time
        // comp last 

        // comp registration status
    });
};

shallowBot();
