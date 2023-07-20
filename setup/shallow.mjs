import * as dotenv from 'dotenv';
dotenv.config();

import { GatewayIntentBits, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, REST, Routes, WebhookClient, ChannelType, StringSelectMenuBuilder } from 'discord.js';
import _ from 'lodash';
import Database from 'coop-shared/setup/database.mjs';
import COOP, { CHANNELS, CHICKEN, ITEMS, MESSAGES, POINTS, REACTIONS, ROLES, SERVER, STATE, TIME, USERS } from '../coop.mjs';
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
import PointsHelper from '../operations/minigames/medium/economy/points/pointsHelper.mjs';


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

        // TODO: Get list of channels/categories.

        // const channels = CHANNELS.config;
        // console.log(channels);

        // const coop = SERVER._coop();
        // const categoryChannels = coop.channels.cache.filter(channel => channel.type === ChannelType.GuildCategory);
        // categoryChannels.map(c => console.log(c.name, c.id));

        // const imgURL = 'https://cdn.discordapp.com/attachments/748649755965522031/1089739736043761714/refer-friends.png';
        // COOP.CHANNELS._codes(['ADVERTS'], imgURL);

        // Cannot preload message 

        // TemporaryMessages.unregisterTempMsgByLink('https://discordapp.com/channels/723660447508725802/731660320514506826/1100379724737433680');

        // coop.channels.create({
        //     name: 'tasks|🔨',
        //     type: ChannelType.GuildForum,
        //     parent: '1097911978560856165'
        // });

        // coop.channels.cache.get('1097915532814057502').delete();
        

        // Agency | 🏭 1097911978560856165

        // TODO: Check if agency role still exists.

        // const agency = CHANNELS._get('1097911978560856165');
        // console.log(agency.name, agency.id);


        // TODO: Restrict permissions to AGENCY role


        // const txsPrevDay = await CHICKEN.getTransactionsPreviousDay();
        // const summarisedTxs = ActivityHelper.summariseTransactions(txsPrevDay);

        // TODO: Check the crate is included in temp messages and thus preloaded?

        // Check server level
        const tempMsgsList = await TemporaryMessages.get();
        const expiredTempMsgs = (
            await MESSAGES.preloadMsgLinks(
                tempMsgsList.map(m => m.message_link))
        ).filter(i => i.error);

        // Remove expired temporary messages.
        expiredTempMsgs.map(msg => TemporaryMessages.unregisterTempMsgByLink(msg.link));
    });
};

shallowBot();




// NOTES BELOW



// DEV WORK AND TESTING ON THE LINES BELOW.


