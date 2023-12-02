import * as dotenv from 'dotenv';
dotenv.config();

import _ from 'lodash';
import { GatewayIntentBits, Client } from 'discord.js';
import Database from 'coop-shared/setup/database.mjs';
import COOP, { CHANNELS, CHICKEN, ITEMS, MESSAGES, POINTS, REACTIONS, ROLES, SERVER, STATE, TIME, USERS } from '../coop.mjs';
import CompetitionHelper, { COMPETITION_ROLES } from '../operations/social/competitionHelper.mjs';
import DatabaseHelper from 'coop-shared/helper/databaseHelper.mjs';
import FoxHuntMinigame from '../operations/minigames/small/foxhunt.mjs';
import WoodcuttingMinigame from '../operations/minigames/small/woodcutting.mjs';
import MiningMinigame from '../operations/minigames/small/mining.mjs';
import StockHelper from '../operations/stock/stockHelper.mjs';
import ChristmasEggHandler from '../operations/minigames/medium/economy/items/handlers/christmasEggHandler.mjs';


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
    COOP.STATE.CLIENT.on('ready', () => SERVER.checkMissingChannels());
    // COOP.STATE.CLIENT.on('ready', () => SERVER.checkMissingRoles());

    // setupCommands(COOP.STATE.CLIENT);
    
    // COOP.STATE.CLIENT.on("voiceStateUpdate", (prev, curr) => {
    //     const channel = curr?.channel || null;
    //     console.log(channel.members);
    // });

    COOP.STATE.CLIENT.on('ready', async () => {
        console.log('Shallow bot is ready');

        // const est = await StockHelper.getEST();


        ChristmasEggHandler.run();
        // console.log(est);
    });

    //     // const agency = CHANNELS._get('1097911978560856165');
    //     // console.log(agency.name, agency.id);

    //     // TODO: Check if agency role still exists.
    //     // TODO: Restrict permissions to AGENCY role

    //     // const txsPrevDay = await CHICKEN.getTransactionsPreviousDay();
    //     // const summarisedTxs = ActivityHelper.summariseTransactions(txsPrevDay);

    //     // Added acorn
    //     // Get them into the game
    //     // TODO: Acorn spawning trees

    //     // const msg = await MESSAGES.getByLink('https://discord.com/channels/723660447508725802/723660447508725806/1141169580081954916');
    //     // console.log(msg);
        
    //     // const talk = await COOP.CHANNELS._getCode('TALK');
    //     // setInterval(async () => {
    //     //     const dropMsg = await COOP.USABLE.drop(talk, 'CHESTNUT');
    //     //     // setTimeout(() => dropMsg.edit('Stolen by fox 🦊'), 1500);
    //     //     // TODO: Remove reactions
    //     // }, 30000);

    //     // talk.send('🦊')
        
    //     // Load the competition.
    //     // const competition = await CompetitionHelper.get('ART_COMPETITION');

    //     // const competitions = await CompetitionHelper.getAll();
    //     // console.log(competitions);

    //     // const events = await DatabaseHelper.manyQuery({
    //     //     text: `SELECT * FROM events`,
    //     // });
    //     // console.log(events);

    //     // Calculate the winner by votes.
    //     // const progress = await CompetitionHelper.check(competitions);
    //     // console.log(progress);

    //     // Calculate the rightful winners.
    //     // let winners = progress.entries;

    //     // console.log(competition);

    //     // Sort entries into vote order.
    //     // winners.sort((a, b) => a.votes > b.votes);

    //     // // Limit winners to first 3.
    //     // winners = winners.slice(0, 3);



    //     // // Handle rewards and notifications for each winner.
    //     // winners.map((w, index) => {
    //     //     // Reward amount.
    //     //     const baseRewardAmount = 4 / (index + 1);
    //     //     const rewardAmount = STATE.CHANCE.natural({ 
    //     //         min: baseRewardAmount, 
    //     //         max: baseRewardAmount * 3
    //     //     });

    //     //     // Generate the rewards for the player.
    //     //     const rawRewards = [];
    //     //     const rewards = [];
    //     //     for (let r = 0; r < rewardAmount; r++) {
    //     //         // Random roll for rarity.
    //     //         let accessibleTiers = ['AVERAGE'];
                
    //     //         // First place gets better rewards.
    //     //         if (index === 0) accessibleTiers.push('RARE', 'LEGENDARY');

    //     //         // Second place gets rare rewards.
    //     //         if (index === 1) accessibleTiers.push('RARE');

    //     //         // Generate and add to the player's rewards.
    //     //         const tier = STATE.CHANCE.pickone(accessibleTiers);
    //     //         const randomReward = DropTable.getRandomTieredWithQty(tier);
    //     //         rawRewards.push(randomReward);
    //     //     }

    //     //     // Clean up the duplicate item awards by merging qtys.
    //     //     rawRewards.map(r => {
    //     //         const index = _.findIndex(rewards, rv => rv.item === r.item);
    //     //         if (index)
    //     //             rewards[index].qty += r.qty;
    //     //         else
    //     //             rewards.push(r);
    //     //     });
            
    //     //     // Add the items to the user.
    //     //     winners[index].rewards = rewards;
    //     // });

    //     // const message = await MESSAGES.getByLink('https://discord.com/channels/723660447508725802/723660447508725806/1158797679065841725');
    //     // message.reply('Thank you, Wyan!');

    //     // FoxHuntMinigame.run();
    //     // listenReactions(FoxHuntMinigame.onReaction);

        
    // });
};

shallowBot();
