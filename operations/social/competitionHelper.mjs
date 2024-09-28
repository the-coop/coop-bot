import Items from 'coop-shared/services/items.mjs';
import { CHANNELS as CHANNELS_CONFIG } from "coop-shared/config.mjs";
import { STATE, CHANNELS, MESSAGES, USERS, ROLES, REACTIONS, TIME, ITEMS } from "../../coop.mjs";

import EventsHelper from "../eventsHelper.mjs";
import DropTable from '../minigames/medium/economy/items/droptable.mjs';

import Competition from './competition/competition.mjs';
import { _fmt, _unfmt } from '../channelHelper.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export const COMPETITION_ROLES = {
    TECHNOLOGY_COMPETITION: 'TECH',
    ART_COMPETITION: 'ART',
    MONEY_COMPETITION: 'MONEY'
};

// const MAX_ENTRANTS = 100;
// TODO: Set to 2 while testing guard
const MAX_ENTRANTS = 2;

// All competitions can run at same time
// TODO: Add organiser field to events table and set creator on setup and check afterwards, and clear it at the end



export default class CompetitionHelper {

    static async onInteraction(interaction) {
        try {
            // Ensure it's a competition channel.
            if (!this.isCompChannel(interaction.channelId)) return;

            // TODO: Need to get the competition_form modal submission too.

            // Whitelist used buttons.
            if (!['setup_competition', 'end_competition', 'competition_form'].includes(interaction?.customId))
                return;
            
            console.log('competition interaction');

            // TODO: Need to guard to leaders/commander

            // const member = await USERS._fetch(user.id);
            // if (!ROLES._has(member, 'COMMANDER') && !ROLES._has(member, 'LEADER'))

            // Find competition code from channelID.
            const code = CHANNELS.idToCode(interaction.channelId);
            const fmtCode = _fmt(code);
            

            // Handle setup competition button.
            if (interaction.customId === 'setup_competition')
                return await this.setup();

            // Handle the competition launch form.
            if (interaction.customId === 'competition_form') 
                return this.configure(code, interaction);

            // Handle user registering for competition.
            if (interaction.customId === 'register_competition')
                return await this.register(code, interaction);

            // Handle finalising the results.
            if (interaction.customId === 'end_competition')
                return await this.end(code, interaction);
                
        } catch(e) {
            console.error(e);
            console.log('Error handling competition interaction.');
        }
    };

    // Also entry point for next competition, adds competition channel message with setup button.
    static async end(competionCode) {
        // Load the competition.
        const competition = await Competition.get(competionCode);
        const channel = CHANNELS._getCode(competionCode.toUpperCase());

        // Calculate the winner by votes.
        const progress = await this.check(competition);

        // Calculate the rightful winners.
        let winners = progress.entries.filter(participant => participant.votes > 0);
        
        // Sort entries into vote order.
        winners.sort((a, b) => a.votes > b.votes);
        
        // Limit winners to first 3.
        winners = winners.slice(0, 3);
        
        // Handle rewards scaled by number of votes and notifications for each winner
        const totalVotes = winners.reduce((sum, participant) => sum + participant.votes, 0);
        winners.map((w, index) => {
            // Reward amount.
            const min = 10 / (index + 1);
            const numRewards = STATE.CHANCE.natural({ min, max: min * totalVotes });

            // Generate the rewards for the player.
            const rawRewards = [];
            const rewards = [];
            for (let r = 0; r < numRewards; r++) {
                // Random roll for rarity.
                let accessibleTiers = ['AVERAGE'];
                
                // First place gets better rewards.
                if (index === 0) accessibleTiers.push('RARE', 'LEGENDARY');

                // Second place gets rare rewards.
                if (index === 1) accessibleTiers.push('RARE');

                // Generate and add to the player's rewards.
                const tier = STATE.CHANCE.pickone(accessibleTiers);
                const randomReward = DropTable.getRandomTieredWithQty(tier);
                rawRewards.push(randomReward);
            }

            // Clean up the duplicate item awards by merging qtys.
            rawRewards.map(r => {
                const index = rewards.findIndex(rv => rv.item === r.item);
                if (index !== -1)
                    rewards[index].qty += r.qty;
                else
                    rewards.push(r);
            });
            
            // Add the items to the user.
            winners[index].rewards = rewards;
            winners[index].rewards.map(r => Items.add(w.entrant_id, r.item, r.qty, 'Competition win'));

            // DM the winners.
            try {
                const competitionWinDMText = `:trophy: Congratulations! ` +
                    // If not first place then not "winning"
                    `You were rewarded for winning the ${_fmt(competionCode)}! :trophy:\n\n` +

                    'You received the following items as a prize:\n' +
                    
                    winners[index].rewards.map(r => `${MESSAGES.emojiCodeText(r.item)} ${r.item}x${r.qty}`).join('\n')
                    
                USERS._dm(w.entrant_id, competitionWinDMText);
            } catch(e) {
                console.log('Error DMing competition winner!');
                console.error(e);
            }
        });

        // Declare the competition winner publicly showing prizes.
        const publicPrizeText = `:trophy: Congratulations! ` +
            `Announcing the ${_fmt(competionCode)} winners! :trophy:\n\n` +

            '**The winners and their prizes** are thus:\n\n' +

            winners.map((w, i) => (
                ':trophy:'.repeat(3 - i) + ` <@${w.entrant_id}>` + '\n' +
                w.rewards.map(r => `${r.item}x${r.qty}`).join('\n') + '\n\n'
            )).join('\n');

        // Annouce publicly (with pings).
        CHANNELS._send('TALK', publicPrizeText);

        // Build the blog post for the competition.
        this.blog();

        // Clear the messages.
        this.cleanEntries(competionCode);

        // Remove the message link from the event.
        await Competition.setLink(competionCode, null);

        // Send the next competition's starting message with setup button.
        const newCompMsg = await channel.send('Competition ready to be setup and launched.');
        newCompMsg.edit({
            components: [
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setEmoji('⚙️')
                        .setLabel("Setup")
                        .setCustomId('setup_competition')
                        .setStyle(ButtonStyle.Secondary)
                ])
            ]
        });

        // Update the message link with new one.
        await Competition.setLink(competionCode, MESSAGES.link(newCompMsg));

        // Set competition is not active.
        await EventsHelper.setActive(competionCode, false);
    };

    static async setup(code, interaction) {
        const fmtCode = _fmt(code);
        const fmtTitle = fmtCode.charAt(0).toUpperCase() + fmtCode.slice(1);

        // Create the form.
        const modal = new ModalBuilder()
            .setCustomId('competition_form')
            .setTitle(`${fmtTitle} details`);

        // Create the text input components
        const titleInput = new TextInputBuilder()
            .setCustomId('competition_title')
            .setLabel("Competition title:")
            .setStyle(TextInputStyle.Short);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('competition_description')
            .setLabel("Details for the competition:")
            .setStyle(TextInputStyle.Paragraph);

        // Add inputs to the modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput)
        );

        // Show the modal to the user.
        return await interaction.showModal(modal);
    };

    static async configure(code, interaction) {
        // If not started, configure and start it.
        // If started, just change the title/description.
        // TODO: Check if competition active
        // TODO: Otherwise launch
        // await this.launch();



        const title = interaction.fields.getTextInputValue('competition_title');
        const description = interaction.fields.getTextInputValue('competition_description');

        const code = CHANNELS.idToCode(interaction.channelId);
        const fmtCode = _fmt(code);

        // TODO: 
        console.log('Should setup competition.');
        console.log(title, description);


    //         await Competition.setTitle(fmtCompCode, title);
    //         await Competition.setDescription(fmtCompCode, description);

        // await this.configure(code, title, description);

        // Starting the competition assumes the message was already created.
        // Clear the previous entrants now

        // TODO: Add the register button

        return await interaction.reply({ content: `Starting ${fmtCode}: ${title}.`, ephemeral: true });
    };

    // Launch the competition
    static async launch(code, interaction) {
        // Identify the competition's relevant channel.
        const channel = CHANNELS._get(interaction.channelId);

        // Clear the previous competition entrants.
        Competition.clearEntrants(code);
        
        // Add details on how to join the competition 
        const pingableRoleText = ROLES._textRef(COMPETITION_ROLES[code.toUpperCase()]);
        const launchedCompMsgText = `**🏆 ${pingableRoleText} users, register soon, ${_fmt(code)} officially launched! 🏆**\n\n`;

        // TODO: Add title and description
        // The copy of the message with registering.
        const launchedCompRegisterMsgText = launchedCompMsgText +
            `_Join the ${_fmt(code)} now by pressing the register buttoon 📋!_`;

        // When competition started, it needs register and end buttons, remove start button.
        const msg = await channel.send(launchedCompRegisterMsgText);
        msg.edit({ 
            components: [
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setEmoji('📝')
                        .setLabel("Register")
                        .setCustomId('register_competition')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setEmoji('⏸️')
                        .setLabel("End")
                        .setCustomId('end_competition')
                        .setStyle(ButtonStyle.Danger),
                ])
            ]
        });

        // Explicitly declare event started.
        await EventsHelper.setActive(code, true);
    };

    // Check the most important things at the beginning of a new day.
    static async check(competition) {
        // Get entries for competition.
        let entries = await Competition.loadEntrants(competition.event_code);

        // Count votes and attach to competition checking result.
        await Promise.all(entries.map(async e => {
            const entrantIndex = entries.findIndex(se => se.entrant_id === e.entrant_id);
            entries[entrantIndex].votes = await this.countVotes(e);
        }));

        // TODO: Should also check when it's being processed incase this misses it.

        // Attach entries object.
        competition.entries = entries;

        // Return the result in the check.
        return competition;
    };

    static async cleanEntries(code) {
        try {
            const channel = CHANNELS._getCode(code.toUpperCase());

            // This won't work with over 100 entries in a competition...
            // Swap to this loop method if this happens...
            // https://stackoverflow.com/questions/48228702/deleting-all-messages-in-discord-js-text-channel
            const msgs = await channel.messages.fetch({ limit: MAX_ENTRANTS });
            await channel.bulkDelete(msgs);
            return true;

        } catch(e) {
            console.log('Error clearing competition ' + code);
            console.error(e);
            return false;
        }
    };

    static async register(code, interaction) {

        // Limit to 100 entrants.
        const entrants = await Competition.loadEntrants(code);
        if (entrants.length >= MAX_ENTRANTS)
            return await interaction.reply({ content: `${entrants.length}/${MAX_ENTRANTS} registered, please try again next time.`, ephemeral: true });

        // TODO: Check they aren't already an entrant.
        // return await interaction.reply({ content: `You are already registered.`, ephemeral: true });

        // Check not already registered on this competition.
        const entrant = await Competition.loadEntrant(code, interaction.userId);
        if (entrant)
            return MESSAGES.selfDestruct(reaction.message, 'You are already registered to this competition.', 0, 5000);

        // Store in database table for competition.
        await Competition.saveEntrant(code, interaction.userId);

        // Publicly announce to bring attention to competition.
        const registerCompMsgText = `📋 <@${interaction.userId}> registered for the ${CHANNELS.textRef(code.toUpperCase())}!`;
        await CHANNELS._send('TALK', registerCompMsgText, {});

        return MESSAGES.selfDestruct(reaction.message, 'You are already registered to this competition.', 0, 5000);
    };

    static async track() {
        // Load all competitions.
        const competitions = await Competition.load();

        // Check if any of the competitions need starting/overdue.
        competitions.map(async comp => {
            // Nothing to check with inactive competitions.
            if (!comp.active) return;

            // Create a text response to be modified conditionally (register period or not).
            let competitionUpdateText = 'Competition updating.';

            // Check the competition.
            const progress = await this.check(comp);

            // Load the information message.
            const compInfoMsg = await MESSAGES.getByLink(comp.message_link);

            // Shared competition details text.
            const competitionDetailsText = `🏆 **__Competition details__** 🏆\n` +
                ( comp.title ? comp.title : ('Working Title...' + '\n')) +
                ( comp.description ? comp.description : ('Campaign managers should edit channel description to competition outline.' + '\n\n'));
            
            // Edit the message to contain registration period content.
            const firstFiveEntrantsByLatestFirst = progress.entries;

            // Sort the entrants by largest id
            firstFiveEntrantsByLatestFirst.sort((a, b) => a.id > b.id);

            competitionUpdateText = competitionDetailsText + '\n\n' +

                `**Registration open!**\n\n` +
                `**Registrants:** \n` +

                firstFiveEntrantsByLatestFirst.map(e => `<@${e.entrant_id}>`).join('\n') +

                `\n\n_To register press the clipboard emoji on this message!_`
                
            // Edit the message to contain registration period content.
            const rankedEntrants = progress.entries;

            // Sort the entrants by largest id
            rankedEntrants.sort((a, b) => a.votes > b.votes);

            // Edit the message to contain post-registration period content.
            competitionUpdateText = (
                competitionDetailsText +
                `**${_fmt(comp.event_code)} continues!**\n\n` +

                `**Currently winning:** \n\n` +
                rankedEntrants.map(e => (
                    `<@${e.entrant_id}> - ${e.votes} vote(s)`
                )).join('\n') +
                
                `\n\n_For more information/details check website: link soon_`
            );

            // Edit the first message that has been posted at top of comp channel.
            compInfoMsg.edit(competitionUpdateText);
        });
    };

    // Calculate the votes present on a competition entry.
    static async countVotes(entry) {
        try {
            // Start on the votes object.
            let votes = 0;

            // Don't consider entrants who did not submit something.
            if (!entry.entry_msg_id) return 0;

            // Access the channel for this competition.
            const channel = CHANNELS._getCode(entry.competition);

            // Load the messages/submission for each entrant.
            const message = await channel.messages.fetch(entry.entry_msg_id);
            if (!message) return 0;

            // Count the votes on the message/submission.
            await Promise.all(message.reactions.cache.map(async r => {
                // Only pay attention to trophy emojis.
                if (r.emoji.name !== '🏆') return;

                // Load the reaction users.
                const reactionUsers = await r.users.fetch();
                reactionUsers.map(ru => {
                    // Ignore Cooper's vote.
                    if (USERS.isCooper(ru.id)) return;

                    // Ignore message author voting for self.
                    if (entry.entrant_id === ru.id) return;

                    // Track this vote as counting.
                    votes++;
                });
            }));

            // Return the total number of votes.
            return votes;

        } catch(e) {
            return 0;
        }
    };

    static async onMessage(msg) {
        // Check if it's a competition channel.
        if (!this.isCompChannel(msg.channel.id)) return false;

        // Check it's not Cooper.
        if (USERS.isCooper(msg.author.id))return false;

        // Calculate the intended competition for submission.
        const code = CHANNELS.formatIDName(msg.channel.id);

        // Access the entrant.
        const entrant = await Competition.loadEntrant(code, msg.author);
        if (!entrant) {
            // Make sure their unauthorized submission (message) will be removed.
            MESSAGES.ensureDeletion(msg);

            // Warn them about registering before posting.
            return MESSAGES.selfDestruct(msg, 'You must register to submit your entry.', 0, 5000);
        }

        // Ensure no existing entry already.
        if (entrant.entry_msg_id) {
            // Warn them about registering before posting.
            MESSAGES.selfDestruct(msg, 'You already have a submission entry/message, edit that instead.', 0, 5000);
            return MESSAGES.ensureDeletion(msg);
        }

        // Attach entry message to entrant
        await Competition.setEntryMsg(entrant.id, msg.id);

        // Notify feed
        CHANNELS._send('TALK', `${msg.author.username} submitted their entry to the ${CHANNELS.textRef(code.toUpperCase())}!`);

        // Add the trophy emoji for voting
        MESSAGES.delayReact(msg, '🏆');
    };

    // If their entry is deleted, unset it.
    static async onDelete(msg) {
        if (this.isCompChannel(msg.channel.id));
            await Competition.unsetEntryByMessageID(msg.id);
    };

    static isCompChannel(id) {
        const { TECHNOLOGY_COMPETITION, ART_COMPETITION, MONEY_COMPETITION } = CHANNELS_CONFIG;
        return [TECHNOLOGY_COMPETITION, ART_COMPETITION, MONEY_COMPETITION]
            .some(c => c.id === id);
    };

    static async blog(competionCode) {
        console.log("Building blog post for " + competionCode);
        
        // Build the blog post for the competition
        // Sort the messages by most votes
        return true;
    };
    
};