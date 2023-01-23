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

        // const txs = await ITEMS.getTransactions();
        // const txsPrevDay = await CHICKEN.getTransactionsPreviousDay();
        // const summarisedTxs = ActivityHelper.summariseTransactions(txsPrevDay);
        // console.log(txsPrevDay);
        // console.log(summarisedTxs);

        StockHelper.announce();

        // const campaigns = await ElectionHelper.loadAllCampaigns();
        // console.log(campaigns);
        
        // listenMessages(RolesHelper.onWebookMessage);

        // Preload 15 intros, should be sufficient for a while.
        // await CHANNELS._getCode('INTRO').messages.fetch({ limit: 15 });

        // Preload sacrifice messages
        // await SacrificeHelper.loadOffers();

        // TODO
        // Preload egghunt items, crates, dropped items, woodcutting, mining.

        // Check if election is on
        // const isElectionOn = await ElectionHelper.isVotingPeriod();
        // console.log(isElectionOn);



        // May be more efficient for now to preload all temporary messages.
        // const tempMsgs = await TemporaryMessages.get();
        // console.log(tempMsgs);

        // MESSAGES.preloadMsgLinks(tempMsgs.map(m => m.message_link))

        // TemporaryMessages.unregisterTempMsgByLink('https://discordapp.com/channels/723660447508725802/1055305753088495726/1055313741148856390');

        // COOP.STATE.CLIENT.on('interactionCreate', async interaction => {
        //     console.log(interaction);

        //     TradingHelper.onInteractionCreate(interaction, COOP.STATE.CLIENT);
        // });

        // Try to add a gold coin to the button as emoji

        // ROLES._add('233416843031871490', 'LEADER');
        // Items.add('233416843031871490', 'LEADERS_SWORD', 1, 'Election failed, manual patch.');


        // SacrificeHelper.announce();
        

        // console.log(TIME.parseHuman('a week from now').getTime());
        // const tannoy = USERS._getMemberByID('221879800900354048');
        // ProjectsHelper.create('galactic-commander', tannoy, 'a week from now');

        // const query = {
        //     text: `SELECT * FROM projects`,
        // };
        
        // const resp = await Database.query(query);
        // console.log(resp.rows);


        // TODO: Post video
        // 

        // Add play button to it

      // const gameLoginLink = 'https://discord.com/api/oauth2/authorize?method=discord_oauth&client_id=799695179623432222' +
      //   "&redirect_uri=https%3A%2F%2Fthecoop.group%2Fauth%2Fauthorise&response_type=code&scope=identify&state=game";
  

      
      // // Add informative buttons to the message.

    //   const msg = await CHANNELS._send('ACTIONS', 'TEST');
    //   msg.edit({ components: [		
    //     new ActionRowBuilder().addComponents([
    //       new ButtonBuilder()
    //         .setEmoji('🌎')
    //         .setLabel("TEST")
    //         .setURL("https://discord.com/channels/723660447508725802/762472730980515870")
    //         .setStyle(ButtonStyle.Link)
    //     ])]

    // const sacrificeEmbedDesc = reaction.message.embeds[0].data.description;


        // const msg = await MESSAGES.getByLink('https://discord.com/channels/723660447508725802/762472730980515870/1066820838743093298');
        // console.log(msg.embeds);

        // SacrificeHelper.announce();
    });
};

shallowBot();




// NOTES BELOW



// DEV WORK AND TESTING ON THE LINES BELOW.


