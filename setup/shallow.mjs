import { GatewayIntentBits, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import _ from 'lodash';
import Database from 'coop-shared/setup/database.mjs';
import secrets from 'coop-shared/setup/secrets.mjs';
import COOP, { CHANNELS, CHICKEN, ITEMS, MESSAGES, REACTIONS, ROLES, SERVER, TIME, USERS } from '../coop.mjs';

// import { CHANNELS as CHANNELS_CONFIG, RAW_EMOJIS, ITEMS as ITEMS_CONFIG } from 'coop-shared/config.mjs';
// import StockHelper from '../operations/stock/stockHelper.mjs';
// import ServerHelper from '../operations/serverHelper.mjs';
// import axios from 'axios';
// import moment from 'moment';
// import Items from 'coop-shared/services/items.mjs';
// import Chicken from '../operations/chicken.mjs';




// v DEV IMPORT AREA v
// import BaseHelper from '../../operations/minigames/medium/conquest/baseHelper.mjs';
// import UsersHelper from '../../operations/members/usersHelper.mjs';
// import ElectionHelper from '../../operations/members/hierarchy/election/electionHelper.mjs';
// import CompetitionHelper, { COMPETITION_DUR } from '../../operations/social/competitionHelper.mjs';
// import EventsHelper from '../../operations/eventsHelper.mjs';
// import EconomyHelper from '../../operations/minigames/medium/economy/economyHelper.mjs';

// import DatabaseHelper from "coop-shared/helper/databaseHelper.mjs";

// import CratedropMinigame from '../../operations/minigames/small/cratedrop.mjs';
// import DropTable from '../../operations/minigames/medium/economy/items/droptable.mjs';
// import AdvertsHelper from '../../operations/marketing/adverts/advertsHelper.mjs';

// import EmojiHelper from 'coop-shared/helper/ui/EmojiHelper.mjs';
// // const EmojiHelper = require('coop-shared/helper/ui/EmojiHelper.mjs');

// import { getAccount } from '../../patching/blockchain/account.mjs';
// import transaction from '../../patching/blockchain/transaction.mjs';
// // import algosdk from 'algosdk';
// import transfer from '../../patching/blockchain/transfer.mjs';
// import mint from '../../patching/blockchain/mint.mjs';

// // import AlgodLogin, { ALGOD_CLIENT, API_URL, INDEXER_URL } from '../../patching/blockchain/algodclient.mjs';
// import optin from '../../patching/blockchain/optin.mjs';
// import ActivityHelper from '../../operations/activity/activityHelper.mjs';
// import BlogHelper from '../../operations/marketing/blog/blogHelper.mjs';

// import EMOJIS from 'coop-shared/config/emojis.mjs';
// import ServerHelper from '../../operations/serverHelper.mjs';
// import SpotlightHelper from '../../operations/members/spotlightHelper.mjs';
// import SacrificeHelper from '../../operations/members/redemption/sacrificeHelper.mjs';
// import TemporaryMessages from '../../operations/activity/maintenance/temporaryMessages.mjs';
// import AboutHelper from '../../operations/marketing/about/aboutHelper.mjs';

// import transaction from '../../patching/blockchain/transaction.mjs';
// import { getAccount } from '../../patching/blockchain/account.mjs';
// ^ DEV IMPORT AREA ^

// Commonly useful.
const listenReactions = (fn) => COOP.STATE.CLIENT.on('messageReactionAdd', fn);
const listenChannelUpdates = (fn) => COOP.STATE.CLIENT.on('channelUpdate', fn);
const listenMessages = (fn) => COOP.STATE.CLIENT.on('messageCreate', fn);

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

    COOP.STATE.CLIENT.on('ready', async () => {
        console.log('Shallow bot is ready');

        // TODO:
        // Add a message with buttons to the information channel.

        COOP.STATE.CLIENT.on('interactionCreate', interaction => {
            console.log(interaction);
        });

		// const row = new ActionRowBuilder()
		// 	.addComponents([
        //         new ButtonBuilder()
		// 			.setLabel('Website')
        //             .setURL('https://thecoop.group')
		// 			.setStyle(ButtonStyle.Link),
        //         new ButtonBuilder()
		// 			.setLabel('Links')
        //             .setURL('https://thecoop.group/links')
		// 			.setStyle(ButtonStyle.Link),
		// 		new ButtonBuilder()
		// 			.setCustomId('login')
		// 			.setLabel('Login')
		// 			.setStyle(ButtonStyle.Primary),
        //     ]);


        //         // new ButtonBuilder()
		// 		// 	.setLabel('Drive')
        //         //     .setURL('https://www.figma.com/file/7Tw7W3VaWReQ7zSlAl2J9d/The-Coop')
		// 		// 	.setStyle(ButtonStyle.Link),
        //         // new ButtonBuilder()
		// 		// 	.setLabel('Designs')
        //         //     .setURL('https://www.figma.com/file/7Tw7W3VaWReQ7zSlAl2J9d/The-Coop')
		// 		// 	.setStyle(ButtonStyle.Link),

        //     // Modify your roles: https://www.thecoop.group/members/roles/
        //     // Permanent invite link: https://discord.gg/thecoop
        //     // Figma/Design Files: https://www.figma.com/file/7Tw7W3VaWReQ7zSlAl2J9d/The-Coop

        //     // Drive: LINK

        // const content = `**The Coop**\nDemocratic, free chicken themed, multiplayer universe enabled,` +
        //     `gravity simulating, economy having, advice giving, learning ` +
        //     `community collaboration server:`;

        //     // Never answered my question
        //     // Moralising and slandering

        // const file = 'https://cdn.discordapp.com/attachments/723660447508725806/1030331201652797440/Screenshot_2022-10-14_at_05.08.02.png';

        // // await CHANNELS._send('ABOUT', test);

        // // const msg = await CHANNELS._send('ABOUT', content + '\n' + test);

        // const channel =  CHANNELS._getCode('ABOUT');
        // const msg = await channel.send({ files: [file] , content });

        // // channel.edit({ components: [row],  });
        // msg.edit({ components: [row] });

		// await interaction.reply({ content: 'I think you should,', components: [row] });





















        // DEV WORK AND TESTING ON THE LINES BELOW.

        // const txs = await Chicken.getTransactionsPreviousDay();
        // console.log(txs);

        // Send Poof and Doc test eggs

        // Ticker of the day (cost gold coin)
        // Make competitions take more leaders to start

        // Create a monthly trigger and clear supporter roles on it

        // Create export_nft command
        // Create import_nft functionality

        // const txs = await ITEMS.getTransactions();
        // const txs = await CHICKEN.getTransactionsPreviousDay();
        // const txsText = ActivityHelper.categorisePresentTransactions(txs);

        // console.log('Previous is the txs for previous day.');
        // console.log(txs);
        // console.log(txsText);

        // DEV WORK AND TESTING ON THE LINES ABOVE.
    });
};

shallowBot();