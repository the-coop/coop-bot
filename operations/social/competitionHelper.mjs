import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import Items from 'coop-shared/services/items.mjs';
import { CHANNELS as CHANNELS_CONFIG } from "coop-shared/config.mjs";
import { STATE, CHANNELS, MESSAGES, USERS, ROLES } from "../../coop.mjs";
import { _fmt, _unfmt } from '../channelHelper.mjs';

import EventsHelper from "../eventsHelper.mjs";
import Competition from './competition/competition.mjs';

import DropTable from '../minigames/medium/economy/items/droptable.mjs';
import { Button } from '../activity/messages/interactionHelper.mjs';

export const COMPETITION_ROLES = {
    TECHNOLOGY_COMPETITION: 'TECH',
    ART_COMPETITION: 'ART',
    BUSINESS_COMPETITION: 'MONEY'
};

const EMPTY_COMPETITION_TEXT = 'Competition ready to be setup and launched.';

const MAX_ENTRANTS = 100;


export default class CompetitionHelper {

    // Handle all the button interactions, setup, configure, end.
    static async onInteraction(interaction) {
        try {
            // Ensure it's a competition channel.
            if (!this.isCompChannel(interaction.channelId)) return;

            // Whitelist used buttons.
            if (!['setup_competition', 'end_competition', 'register_competition', 'competition_form'].includes(interaction?.customId))
                return;
            
            // Guard to member role.
            if (!ROLES._has(interaction.member, 'MEMBER'))
                return await interaction.reply({ content: `Only members can use competition features.`, ephemeral: true });

            // Find competition code from channelID.
            const code = CHANNELS.idToCode(interaction.channelId).toLowerCase();

            // Handle setup competition button.
            if (interaction.customId === 'setup_competition')
                return await this.setup(code, interaction);

            // Handle the competition launch form.
            if (interaction.customId === 'competition_form') 
                return this.configure(code, interaction);

            // Handle user registering for competition.
            if (interaction.customId === 'register_competition')
                return await this.register(code, interaction);

            // Handle finalising the results.
            if (interaction.customId === 'end_competition')
                return await this.end(code, interaction);

            // TODO: Remove if unnecessary???
            return await interaction.reply({ content: `Something weird happening?`, ephemeral: true });
                
        } catch(e) {
            console.error(e);
            console.log('Error handling competition interaction.');
            return await interaction.reply({ content: `Error handling competition interaction.`, ephemeral: true });
        }
    };

    // Also entry point for next competition, adds competition channel message with setup button.
    static async end(code, interaction) {
        try {
            // Load the competition.
            const comp = await Competition.get(code);
    
            // Ensure only organiser can end it.
            if (comp.organiser !== interaction.user.id)
                return await interaction.reply({ content: `Only the organisar can end the competition.`, ephemeral: true });
    
            // Calculate the winner by votes.
            await this.attachSubmissions(comp);
    
            // Calculate the rightful winners.
            let winners = comp.entries.filter(participant => participant.votes > 0);
            
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
            });
    
            // Declare the competition winner publicly showing prizes.
            const finalText = `:trophy: Congratulations! ` +
                `Announcing the ${_fmt(code)} winners! :trophy:\n\n` +
    
                '**The winners and their prizes** are thus:\n\n' +
    
                winners.map((w, i) => (
                    ':trophy:'.repeat(3 - i) + ` <@${w.entrant_id}>` + '\n' +
                    w.rewards.map(r => `${r.item}x${r.qty}`).join('\n') + '\n\n'
                )).join('\n');
    
            // Annouce publicly (with pings).
            CHANNELS._send('TALK', finalText);
    
            // Build the blog post for the competition.
            this.blog(code);
    
            // Clear the messages.
            await this.clean(comp);

            // Set competition is not active.
            comp.active = await EventsHelper.setActive(code, false);
            
            // Send the next competition's starting message with setup button.
            this.sync(comp);
    
            // Provide feedback/end interaction.
            return await interaction.reply({ content: `Ended competition, posted results to talk channel.`, ephemeral: true });

        } catch(e) {
            console.error(e);
            console.log('Error ending competition');
        }

        return await interaction.reply({ content: `Error ending competition.`, ephemeral: true });
    };
    
    // Displays required fields for competition information.
    static async setup(code, interaction) {
        try {
            // Defer the interaction to prevent timeouts/confusion.
            // await interaction.deferUpdate();

            // Check if competition already active and they are the organiser interaction.user.id
            const comp = await Competition.get(code);
            if (comp.active && comp.organiser !== interaction.user.id)
                return await interaction.reply({ content: `Only the organisar can edit the competition.`, ephemeral: true });
    
            // Format competition info for form display.
            const fmtCode = _fmt(code);
            const fmtTitle = fmtCode.charAt(0).toUpperCase() + fmtCode.slice(1);
    
            // Create the text input components form, and show to use.
            const modal = new ModalBuilder().setCustomId('competition_form').setTitle(`${fmtTitle} details`);
            return await interaction.showModal(modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('competition_title')
                        .setLabel("Competition title:")
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('competition_description')
                        .setLabel("Details for the competition:")
                        .setStyle(TextInputStyle.Paragraph)
                )
            ));

        } catch(e) {
            console.error(e);
            console.log('Error showing setup competition modal.');
        }

        return await interaction.reply({ content: `Error modifying/setting up competition.`, ephemeral: true });
    };

    // Set the title and description and start competition if needed.
    static async configure(code, interaction) {
        try {
            // Extract values from setup modal form.
            const title = interaction.fields.getTextInputValue('competition_title');
            const description = interaction.fields.getTextInputValue('competition_description');

            // Load competition.
            const comp = await Competition.get(code);

            // Update the competition data based on inputs
            await Competition.setTitle(code, title);
            await Competition.setDescription(code, description);

            // Update information since it's passed to sync method.
            comp.title = title;
            comp.description = description;

            // Decide whether to start the competition or edit.
            if (!comp.active) {
                // Clear the previous competition entrants.
                await Competition.clearEntrants(code);
    
                // Explicitly declare event started.
                comp.active = await EventsHelper.setActive(code, true);
    
                // Explicitly declare event started.
                await EventsHelper.setOrganiser(code, interaction.user.id);
            }

            // Update the competition summary.
            this.sync(comp);

            // Inform organiser the edit is successful.
            return await interaction.reply({ content: `${comp.active ? 'Edited' : 'Started'} your ${_fmt(code)} (${title})`, ephemeral: true });

        } catch(e) {
            console.error(e);
            console.log('Error configuring competition');
        }

        return await interaction.reply({ content: `Error handling configure competition form.`, ephemeral: true });
    };

    // Handles users registering to the competition via register button.
    static async register(code, interaction) {
        try {
            console.log('trying to register', code);

            // Limit to 100 entrants until it becomes a problem (Discord inherited problem).
            const entrants = await Competition.loadEntrants(code);
            if (entrants.length >= MAX_ENTRANTS)
                return await interaction.reply({ content: `${entrants.length}/${MAX_ENTRANTS} registered, please try again next time.`, ephemeral: true });
    
            // Check not already registered on this competition.
            const entrant = await Competition.loadEntrant(code, interaction.user.id);
            if (entrant)
                return await interaction.reply({ content: `You're already registered to the ${_fmt(code)}.`, ephemeral: true });
    
            // Load competition.
            const comp = await Competition.get(code);
    
            // Store in database table for competition.
            await Competition.saveEntrant(code, interaction.user.id);
    
            // Publicly announce to bring attention to competition.
            await CHANNELS._send('TALK', `📋 <@${interaction.user.id}> registered for the ${CHANNELS.textRef(code.toUpperCase())}!`, {});
    
            // Update the competition messages
            this.sync(comp);
    
            // Reply to the interaction with feedback.
            return await interaction.reply({ content: `Successfully registered for the ${_fmt(code)}!`, ephemeral: true });

        } catch(e) {
            console.error(e);
            console.log('Error registering for ' + code);
        }
        return await interaction.reply({ content: 'Failed to register, please try later.', ephemeral: true });
    };

    // Ensure the competition summary messages stay up to date.
    static async sync(comp) {
        try {
            // Check the competition.
            await this.attachSubmissions(comp);
    
            // Sort the entrants by largest id
            comp.entries.sort((a, b) => a.votes > b.votes);
    
            // Format the message for the competition summary message.
            let content = EMPTY_COMPETITION_TEXT;
    
            // TODO: If no submissions show registration information
            // TODO: If submissions start to show voting information
            
            // Format message for active competitions.
            // TODO: Add number registered after in progress (5 registered example)
            if (comp.active)
                content = `# **🏆 ${comp.title} 🏆**\n## ${comp.description}\n` +
                    comp.entries.map(e => `<@${e.entrant_id}> (${e.votes} vote(s))`).join('\n');
    
            // Edit the competition summary message with formatted information.
            const msg = await MESSAGES.getByLink(comp.message_link);
            
            // Buttons dependent on competition state.
            const SetupButton = Button('⚙️', "Setup", 'setup_competition', ButtonStyle.Secondary);
            const RegisterButton = Button('📝', "Register", 'register_competition', ButtonStyle.Success);
            const EndButton = Button("⏸️", "End", 'end_competition', ButtonStyle.Danger);
            msg.edit({ content, components: [new ActionRowBuilder().addComponents([
                SetupButton, ...(comp.active ? [EndButton, RegisterButton] : [])
            ])] });
    
            // Update channel topic.
            const channel = CHANNELS._getCode(comp.event_code.toUpperCase());
            await channel.setTopic(comp.active ? `${comp.title} - ${comp.description}` : content);

        } catch(e) {
            console.error(e);
            console.log('Error syncing competition summary message');
        }
    };

    // Attach the entries and votes to the competition.
    static async attachSubmissions(comp) {
        // Get entries for competition.
        let entrants = await Competition.loadEntrants(comp.event_code);

        // Count votes and attach to competition checking result.
        await Promise.all(entrants.map(async e => {
            const entrantIndex = entrants.findIndex(se => se.entrant_id === e.entrant_id);
            entrants[entrantIndex].votes = await this.count(e);
        }));

        // Attach entries object.
        comp.entries = entrants;

        // Return the result in the check.
        return comp;
    };

    // Calculate the votes present on a competition entry.
    static async count(entry) {
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
            console.error(e);
            console.log('Error counting competition message votes.');
            return 0;
        }
    };

    // Handle entry submissions to the competition channel.
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
        // Only applies to competition messages that are deleted.
        if (!this.isCompChannel(msg.channel.id)) return;

        // Doesn't apply to delete bot messages.
        if (USERS.isCooperMsg(msg)) return;

        // Unset their competition entry message if they have one.
        const code = CHANNELS.idToCode(msg.channel.id);
        const entrant = await Competition.loadEntrant(code.toLowerCase(), msg.author.id);
        if (entrant?.entry_msg_id)
            await Competition.unsetEntryByMessageID(msg.id);
    };

    // Clean the entry messages from the channel, including the summary.
    static async clean(comp) {
        try {
            const channel = CHANNELS._getCode(comp.event_code.toUpperCase());
            const msgs = await channel.messages.fetch({ limit: MAX_ENTRANTS });

            const filtered = msgs.filter(m => MESSAGES.link(m) !== comp.message_link);
            console.log(filtered);
            await channel.bulkDelete(filtered);
            return true;

        } catch(e) {
            console.log('Error clearing competition ' + comp.event_code);
            console.error(e);
        }
        return false;
    };

    // Check if ID is a competition channel ID.
    static isCompChannel(id) {
        const { TECHNOLOGY_COMPETITION, ART_COMPETITION, BUSINESS_COMPETITION } = CHANNELS_CONFIG;
        return [TECHNOLOGY_COMPETITION, ART_COMPETITION, BUSINESS_COMPETITION]
            .some(c => c.id === id);
    };

    // Attempt to build a blogpost from the competition.
    static async blog(code) {
        console.log("Building blog post for " + code);
        
        // Build the blog post for the competition
        // Sort the messages by most votes
        return true;
    };
    
};