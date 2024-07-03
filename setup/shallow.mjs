import * as dotenv from 'dotenv';
dotenv.config();

import _ from 'lodash';
import { GatewayIntentBits, Client, Poll } from 'discord.js';
import Database from 'coop-shared/setup/database.mjs';
import COOP, { CHANNELS, CHICKEN, ITEMS, MESSAGES, POINTS, REACTIONS, ROLES, SERVER, STATE, TIME, USERS } from '../coop.mjs';
import CompetitionHelper, { COMPETITION_ROLES } from '../operations/social/competitionHelper.mjs';
import DatabaseHelper from 'coop-shared/helper/databaseHelper.mjs';
import FoxHuntMinigame from '../operations/minigames/small/foxhunt.mjs';
import WoodcuttingMinigame from '../operations/minigames/small/woodcutting.mjs';
import MiningMinigame from '../operations/minigames/small/mining.mjs';
import StockHelper from '../operations/stock/stockHelper.mjs';
import ChristmasEggHandler from '../operations/minigames/medium/economy/items/handlers/christmasEggHandler.mjs';
import Items from 'coop-shared/services/items.mjs';
import EggHuntMinigame from '../operations/minigames/small/egghunt.mjs';
import Chicken from '../operations/chicken.mjs';
import ActivityHelper from '../operations/activity/activityHelper.mjs';
import TimeHelper from '../operations/timeHelper.mjs';
import SpotlightHelper from '../operations/members/spotlightHelper.mjs';
import RolesHelper from '../operations/members/hierarchy/roles/rolesHelper.mjs';
import VotingHelper from '../operations/activity/redemption/votingHelper.mjs';
import ElectionHelper from '../operations/members/hierarchy/election/electionHelper.mjs';


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
    // COOP.STATE.CLIENT.on('ready', () => SERVER.checkMissingChannels());
    // COOP.STATE.CLIENT.on('ready', () => SERVER.checkMissingRoles());

    // setupCommands(COOP.STATE.CLIENT);
    
    // COOP.STATE.CLIENT.on("voiceStateUpdate", (prev, curr) => {
    //     const channel = curr?.channel || null;
    //     console.log(channel.members);
    // });

    COOP.STATE.CLIENT.on('ready', async () => {
        console.log('Shallow bot is ready');

        // RolesHelper.add(kilo, 'MEMBER');
        // const kilo = COOP.USERS._get('440631423230279680');

        // const worm = COOP.USERS._get('230494953917251584');
        // const kayla = COOP.USERS._get('1202028076436041780');

        // Items.subtract('287062661483724810', 'LEADERS_SWORD', 1, 'CORRECT_ELECTION');
        // Items.add('287062661483724810', 'ELECTION_CROWN', 1, 'CORRECT_ELECTION');

        // worm.ban();
        // kayla.ban();

        // FoxHuntMinigame.run();

        // console.log(slush);
        // console.log(slush.voice.setMute);

        // slush.voice.setMute(true);

        const LEADERS_RATIO_PERC = .008175;
        const num = VotingHelper.getNumRequired(LEADERS_RATIO_PERC);
        console.log(num);

        // const msg = await COOP.CHANNELS._send('TALK', 'TESTING');
        // console.log(msg);

        // const votes = await ElectionHelper.fetchAllVotes();
        // const hierarchy = ElectionHelper.calcHierarchy(votes);
        // console.log(hierarchy);

        // SERVER._coop().members.unban('429199371582832641', 'Skill issue');
        // 429199371582832641

        // TODO: Check past 24 egg count
        // CHANNELS._show(CHANNELS.config.SPOTLIGHT.id);

        // SpotlightHelper.end();
        // SpotlightHelper.start();

        // 953620876685869068

        // const channel = CHANNELS._getCode('SPOTLIGHT');
        // const msgs = await channel.messages.fetch({ limit: 100 });
        // console.log(msgs);
        // console.log(channel.bulkDelete);
        // await channel.bulkDelete(100);

        // const p = new Poll()
        // console.log(p);

        // try {

        // } catch(e) {
        //     console.error(e);
        //     // console.log(e.rawError.errors.poll);
        //     // console.log(e.rawError.errors.poll.question._errors);
        //     // console.log(e.rawError.errors.poll.answers[0].poll_media._errors);
        //     // console.log('test');
        // }

        // question	Poll Media Object	The question of the poll. Only text is supported.
        // answers	List of Poll Answer Objects	Each of the answers available in the poll, up to 10
        // duration	integer	Number of hours the poll should be open for, up to 7 days
        // allow_multiselect	boolean	Whether a user can select multiple answers
        

        // const txsPrevDay = await Chicken.getTransactionsPreviousDay();
        // const summarisedTxs = ActivityHelper.summariseTransactions(txsPrevDay);
        // console.log(txsPrevDay);

        // console.log(TimeHelper._secs(), 86400);
        // const query = {
        //     // text: `SELECT * FROM item_qty_change_history WHERE occurred_secs > $1`,
        //     text: `SELECT * FROM item_qty_change_history ORDER BY occurred_secs DESC`,
        //     // values: [TimeHelper._secs() - 86400]
        // };
        // const result = await DatabaseHelper.manyQuery(query);
        // console.log(result[0], result[1], result[2], result[3], result[5]);


        // const est = await StockHelper.getEST();

        // 200657841676222465


        // EggHuntMinigame.run();


        // Items.subtract('200657841676222465', 'ELECTION_CROWN', 1, 'Cheating fucker');



        // ChristmasEggHandler.run();
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
