import { GatewayIntentBits, Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, REST, Routes } from 'discord.js';
import _ from 'lodash';
import Database from 'coop-shared/setup/database.mjs';
import secrets from 'coop-shared/setup/secrets.mjs';
import COOP, { CHANNELS, CHICKEN, ITEMS, MESSAGES, REACTIONS, ROLES, SERVER, STATE, TIME, USERS } from '../coop.mjs';
import setupCommands from './commands.mjs';
import { BOTS } from 'coop-shared/config.mjs';
import RolesHelper from '../operations/members/hierarchy/roles/rolesHelper.mjs';
import Items from 'coop-shared/services/items.mjs';

import TradingHelper from '../operations/minigames/medium/economy/items/tradingHelper.mjs';
import Trading from 'coop-shared/services/trading.mjs';
import StockHelper from '../operations/stock/stockHelper.mjs';
import Chicken from '../operations/chicken.mjs';
import ActivityHelper from '../operations/activity/activityHelper.mjs';


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
    COOP.STATE.CLIENT.on('ready', () => SERVER.checkMissingRoles());

    // setupCommands(COOP.STATE.CLIENT);

    COOP.STATE.CLIENT.on('ready', async () => {
        console.log('Shallow bot is ready');

        const txs = await Chicken.getTransactionsPreviousDay();
        // console.log(txs);

        console.log(ActivityHelper.summariseTransactions(txs));
    });
};

shallowBot();















// NOTES BELOW


// const url = 'https://www.thecoop.group/powerhour1.mp3';
// Chicken.joinAndPlay('STOCKS_VC', url);

// const query = {
//     name: "add-candidate",
//     text: `INSERT INTO candidates(campaign_msg_link, candidate_id)
//         VALUES($1, $2)`,
//     values: [msgLink, userID]
// };

// const result = await Database.query(query);

// const query = {
//     text: `SELECT * FROM candidates`
// };

// const result = await Database.query(query);
// console.log(result);

// const query = {
//     text: `DELETE FROM candidates WHERE candidate_id = $1`,
//     values: ['275988544479297546']
// };

// const result = await Database.query(query);
// console.log(result);


// Items.add('513318314064478210', 'LEADERS_SWORD', 1);
// Items.add('651538904901615627', 'ELECTION_CROWN', 1);

// Items.subtract('275988544479297546', 'ELECTION_CROWN', 1);


// static async create(ownerID, targetURL, imageURL) {
//     try {
//         const query = {
//             name: "create-advert",
//             text: `INSERT INTO adverts(owner_id, target_url, image_url) VALUES($1, $2, $3)`,
//             values: [ownerID, targetURL, imageURL]
//         };
        
//         await Database.query(query);
//     } catch(e) {
//         console.log('Error creating advert');
//         console.error(e);
//     }
// }


// const query = {
//     name: "create-advert",
//     text: `INSERT INTO adverts(owner_id, target_url, image_url) VALUES($1, $2, $3)`,
//     values: [ownerID, targetURL, imageURL]
// };

// await Database.query(query);

// const query = { 
//     // text: `UPDATE adverts SET  FROM adverts`,
//     text: `UPDATE adverts SET image_url = $1 WHERE id = $2`,
//     values: ["https://cdn.discordapp.com/attachments/723660447508725806/1041194776860557466/Screenshot_2022-05-31_at_02.38.07-2.png", 10]
// };

// const result = await Database.query(query);

// console.log(result.rows);

// const rolesCache = RolesHelper._all();
// rolesCache.map(r => console.log(r.name, r.id));

// COOP.STATE.CLIENT.on('interactionCreate', async interaction => {
//     console.log(interaction);

//     TradingHelper.onInteractionCreate(interaction, COOP.STATE.CLIENT);
// });



// const msg = await MESSAGES.getByLink('https://discord.com/channels/723660447508725802/762472730980515870/1030376436730712114');

// const rolesLoginLink = 'https://discord.com/api/oauth2/authorize?method=discord_oauth&client_id=799695179623432222' +
//     "&redirect_uri=https%3A%2F%2Fthecoop.group%2Fauth%2Fauthorise&response_type=code&scope=identify&state=roles";

// const gameLoginLink = 'https://discord.com/api/oauth2/authorize?method=discord_oauth&client_id=799695179623432222' +
//     "&redirect_uri=https%3A%2F%2Fthecoop.group%2Fauth%2Fauthorise&response_type=code&scope=identify&state=game"

// // const msgLink = 'https://discord.com/channels/723660447508725802/762472730980515870/1030376436730712114';


// msg.edit({ components: [		
//     new ActionRowBuilder().addComponents([
//         new ButtonBuilder()
//             .setEmoji('🔗')
//             .setLabel("Links")
//             .setURL('https://thecoop.group/links')
//             .setStyle(ButtonStyle.Link),
//         new ButtonBuilder()
//             .setEmoji('⚙️')
//             .setLabel("Roles")
//             .setURL(rolesLoginLink)
//             .setStyle(ButtonStyle.Link),
//         new ButtonBuilder()
//             .setEmoji('🎮')
//             .setLabel("Play")
//             .setURL(gameLoginLink)
//             .setStyle(ButtonStyle.Link)
//     ])]
// });


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
