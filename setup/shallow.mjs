import * as dotenv from 'dotenv';
dotenv.config();

import _ from 'lodash';
import { GatewayIntentBits, Client, time, ActionRow, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import Database from 'coop-shared/setup/database.mjs';
import { CHANNELS, MESSAGES, SERVER, STATE, TIME, USERS } from '../coop.mjs';
import Items from 'coop-shared/services/items.mjs';
import ElectionHelper from '../operations/members/hierarchy/election/electionHelper.mjs';
import CompetitionHelper from '../operations/social/competitionHelper.mjs';
import EventsHelper from '../operations/eventsHelper.mjs';
import EggHuntMinigame from '../operations/minigames/small/egghunt.mjs';
import SuggestionsHelper from '../operations/activity/suggestions/suggestionsHelper.mjs';
import ReactionHelper from '../operations/activity/messages/reactionHelper.mjs';
import SacrificeHelper from '../operations/members/redemption/sacrificeHelper.mjs';
import { EMOJIS } from 'coop-shared/config.mjs';
import RolesHelper from '../operations/members/hierarchy/roles/rolesHelper.mjs';
import WoodcuttingMinigame from '../operations/minigames/small/woodcutting.mjs';
import MiningMinigame from '../operations/minigames/small/mining.mjs';


// Commonly useful.
// const listenReactions = (fn) => COOP.STATE.CLIENT.on('messageReactionAdd', fn);
// const listenChannelUpdates = (fn) => COOP.STATE.CLIENT.on('channelUpdate', fn);
// const listenMessages = (fn) => COOP.STATE.CLIENT.on('messageCreate', fn);
// const listenVoiceState = (fn) => COOP.STATE.CLIENT.on('voiceStateUpdate', fn);
// const listenDeleteions = (fn) => STATE.CLIENT.on('messageDelete', fn);
const listenInteractions = (fn) => STATE.CLIENT.on('interactionCreate', fn);


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
    // STATE.CLIENT.on('ready', () => SERVER.checkMissingChannels());
    // COOP.STATE.CLIENT.on('ready', () => SERVER.checkMissingRoles());

    // setupCommands(COOP.STATE.CLIENT);

    STATE.CLIENT.on('ready', async () => {
        console.log('Shallow bot is ready');

        // MiningMinigame.run();

        // Items.add('238043760766877697', 'PICK_AXE', 5);

        // TODO: Test premium button with an SKU?

        // const msg = await MESSAGES.selfDestruct(CHANNELS._getCode('TALK'), 'Testing competition improvements.');
        // msg.edit({ 
        //     components: [
        //         new ActionRowBuilder().addComponents([
        //             new ButtonBuilder()
        //                 .setEmoji('⚙️')
        //                 .setLabel("Setup")
        //                 .setCustomId('setup_competition')
        //                 .setStyle(ButtonStyle.Secondary),
        //             new ButtonBuilder()
        //                 .setEmoji('📝')
        //                 .setLabel("Register")
        //                 .setCustomId('join_competition')
        //                 .setStyle(ButtonStyle.Success),
        //             new ButtonBuilder()
        //                 .setEmoji('⏸️')
        //                 .setLabel("Finish")
        //                 .setCustomId('end_competition')
        //                 .setStyle(ButtonStyle.Danger)
        //         ])
        //     ]
        // });

        // listenInteractions(CompetitionHelper.onInteraction);


        // TODO: Test this
        
        // // CHANNELS._send('TALK', actionText);
        // console.log(actionText);

        // const msg = await MESSAGES.getByLink('https://discord.com/channels/723660447508725802/723660447508725806/1279259746515292261');

        // const regex = new RegExp(`\\b${'_lmf_'}\\b \\+(\\d+)${EMOJIS.WOOD} \\+(\\d+)${ptsEmoji}`, 'i');
        // const match = l.match(regex);
        // console.log(match);

        //     const wood = parseInt(match[1], 10);
        //     const pts = parseInt(match[2], 10);

        // const actionText = `${'testing'} +${10}${EMOJIS.WOOD} +${10}${MESSAGES.emojiCodeText('COOP_POINT')}`;
        // const msg = await CHANNELS._send('TALK', actionText);
        // msg.edit({ 
        //     components: [
        //         new ActionRowBuilder().addComponents([
        //             new ButtonBuilder()
        //                 .setEmoji('🪓')
        //                 .setLabel("Chop")
        //                 .setCustomId('chop')
        //                 .setStyle('Primary')
        //         ])
        //     ]
        // });

        // WoodcuttingMinigame.run();



        // TODO: Test sacrifice mechanism   

        // const msg = await MESSAGES.getByLink('https://discord.com/channels/723660447508725802/723660447508725806/1279259746515292261');
        // console.log(msg.poll);

        // TODO: Load/track sacrifices?

        // TODO: Intercept sacrifice ended?
    });
};

shallowBot();
