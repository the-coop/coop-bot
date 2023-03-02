import { GatewayIntentBits, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, REST, Routes, WebhookClient } from 'discord.js';
import _ from 'lodash';
import Database from 'coop-shared/setup/database.mjs';
import secrets from 'coop-shared/setup/secrets.mjs';
import COOP, { CHANNELS, CHICKEN, ITEMS, MESSAGES, REACTIONS, ROLES, SERVER, STATE, TIME, USERS } from '../coop.mjs';
import setupCommands from './commands.mjs';
import { BOTS, EMOJIS } from 'coop-shared/config.mjs';
import RolesHelper from '../operations/members/hierarchy/roles/rolesHelper.mjs';
import Items from 'coop-shared/services/items.mjs';

import TradingHelper from '../operations/minigames/medium/economy/items/tradingHelper.mjs';
import Trading from 'coop-shared/services/trading.mjs';
import StockHelper from '../operations/stock/stockHelper.mjs';
import Chicken from '../operations/chicken.mjs';
import ActivityHelper from '../operations/activity/activityHelper.mjs';
import UsersHelper from '../operations/members/usersHelper.mjs';
import TemporaryMessages from '../operations/activity/maintenance/temporaryMessages.mjs';
import SocialHelper from '../operations/social/socialHelper.mjs';
import UserRoles from 'coop-shared/services/userRoles.mjs';
import DatabaseHelper from 'coop-shared/helper/databaseHelper.mjs';
import SacrificeHelper from '../operations/members/redemption/sacrificeHelper.mjs';
import ProjectsHelper from '../operations/productivity/projects/projectsHelper.mjs';
import ElectionHelper from '../operations/members/hierarchy/election/electionHelper.mjs';
import BlogHelper from '../operations/marketing/blog/blogHelper.mjs';
import RedditHelper from '../operations/marketing/blog/redditHelper.mjs';
import ItemsHelper from '../operations/minigames/medium/economy/items/itemsHelper.mjs';


// Commonly useful.
const listenReactions = (fn) => COOP.STATE.CLIENT.on('messageReactionAdd', fn);
const listenChannelUpdates = (fn) => COOP.STATE.CLIENT.on('channelUpdate', fn);
const listenMessages = (fn) => COOP.STATE.CLIENT.on('messageCreate', fn);
const listenVoiceState = (fn) => COOP.STATE.CLIENT.on('voiceStateUpdate', fn);


const shallowBot = async () => {
    console.log('Starting shallow bot');

    // Load secrets.
    await secrets();

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

        // const txsPrevDay = await CHICKEN.getTransactionsPreviousDay();
        // const summarisedTxs = ActivityHelper.summariseTransactions(txsPrevDay);

        // BlogHelper.postToReddit('TESTIgewawegwegawgwNG', 'COgwegawegwagwegewggwNTENT');
        
        // console.log(await BlogHelper.redditAccessToken());
        // await BlogHelper.test();

        // const announceRole = ROLES._getByCode('SUBSCRIBER');
        // console.log(announceRole);

        // const electionText = `our latest ${CHANNELS.textRef('ELECTION')} is running, all members are welcome to stand or vote for their preferred commander and leaders. \n` +
        //     `For further information on our elections refer to our forth amendment in ${CHANNELS.textRef('ABOUT')}\n\n` +

        //     `To enter election yourself use the /stand slash command with a short message of why people should vote for you.\n` +
        //     `To nominate another person for leadership use the /nominate slash command with a similar message.\n\n`;

        // const msg = await CHANNELS._send(
        //     'TALK', 
        //     `${ROLES._textRef('SUBSCRIBER')}, ${electionText}`,
        //     { allowedMentions: { roles: [announceRole.id] }}
        // );

        // SacrificeHelper.random();

        // const offer = (await SacrificeHelper.loadOffers())[0];
        // const message = await MESSAGES.getByLink(offer.message_link);

        // console.log(message.embeds[0].data.description);

        // const desc = message.embeds[0].data.description;
        // const discordID = /<@(\d*)>/.exec(desc)[1];


        // Items.add('786671654721683517', 'LEADERS_SWORD', 1, 'Left accidentally, still a valid leader');

        // TODO: Check the crate is included in temp messages and thus preloaded?

        // ElectionHelper.ensureItemSeriousness();

        // RedditHelper.prompt();

        // RedditHelper.codeToToken('zCG8I_n5dIHPAkxM1aMQHLOd1KRupw#')

        // tqTfiVcnOKXqzQVhXWEw5j6U8glu0A#_
        
    });
};

shallowBot();




// NOTES BELOW



// DEV WORK AND TESTING ON THE LINES BELOW.


