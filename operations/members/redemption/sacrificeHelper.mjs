import VotingHelper from '../../activity/redemption/votingHelper.mjs';

import { EMOJIS, CHANNELS } from 'coop-shared/config.mjs';
import CooperMorality from '../../minigames/small/cooperMorality.mjs';

import COOP, { MESSAGES, ROLES, USERS, SERVER } from '../../../coop.mjs';
import TemporaryMessages from '../../activity/maintenance/temporaryMessages.mjs';
import Items from 'coop-shared/services/items.mjs';
import { ButtonStyle, ActionRowBuilder, ButtonBuilder } from 'discord.js';

export const SACRIFICE_RATIO_PERC = .05;
export const KEEP_RATIO_PERC = .02;

const sacrificeMsgLifetime = 60 * 60 * 12;

export default class SacrificeHelper {

    static loadOffers() {
        return TemporaryMessages.getType('SACRIFICE');
    };

    static isBackDagger(reaction, user) {
        const emoji = reaction.emoji.name;
        const isDagger = COOP.MESSAGES.emojiToUni(emoji) === COOP.MESSAGES.emojiToUni(EMOJIS.DAGGER);

        // if (isSacrificeChannel) return false;
        if (user.bot) return false;
        if (reaction.message.author.bot) return false;
        if (!isDagger) return false;

        // Guards passed.
        return true;
    };

    static async onReaction(reaction, user) {
        // Process a vote on sacrifice channel itself.
        const channelID = reaction.message.channel.id;
        const isSacrificeChannel = channelID !== CHANNELS.TALK.id;

        // Check other channels for backstabbing daggers/ban attempts.
        if (!isSacrificeChannel && this.isBackDagger(reaction, user))
            this.processBackDagger(reaction, user);
    };

    static async processBackDagger(reaction) {
        const guild = COOP.SERVER._coop();

        // Calculate the number of required votes for the redemption poll.
        const reqSacrificeVotes = VotingHelper.getNumRequired(SACRIFICE_RATIO_PERC);
    
        // Get existing reactions on message.
        let sacrificeVotes = 0;
        reaction.message.reactions.cache.map(reactionType => {
            const emoji = reactionType.emoji.name;
            if (COOP.MESSAGES.emojiToUni(emoji) === COOP.MESSAGES.emojiToUni(EMOJIS.DAGGER)) {
                sacrificeVotes = reactionType.count;
            }
        });

        // Limit this to only reaction to a certain count of emojis, fire once.
        if (sacrificeVotes === reqSacrificeVotes) {
            const targetID = reaction.message.author.id;
            const targetMember = await COOP.USERS.fetchMemberByID(guild, targetID);

            // TODO: Award points to backstabbers
            // TODO: Award points for successfully removing a backstabbed member.
            // TODO: Also reward points for approving/rejecting an incoming member (reward more for rejection)
            // TODO: limit number of sacrifices to a maximum of five by checking the number of messages in the sacrifice channel

            await this.offer(targetMember.user);

            setTimeout(async () => {
                // May have got stabbed more in the past 3 seconds.
                // TODO: Implement backstabbers list.
                let updatedNumVotes = sacrificeVotes;
                // const backstabbers = [];
                reaction.message.reactions.cache.map(reactionType => {
                    const emoji = reactionType.emoji.name;
                    if (emoji === EMOJIS.DAGGER) updatedNumVotes = reactionType.count;
                });

                // const backstabMsg = 
                await reaction.message.channel.send(
                    `${targetMember.user.username} got backstabbed! ${EMOJIS.DAGGER.repeat(updatedNumVotes)}`
                );
            }, 3000);
        }
    };

    static async getLastSacrificeSecs(userID) {
        const lastSacSecs = await COOP.USERS.getField(userID, 'last_sacrificed_secs');
        return lastSacSecs;
    };

    static async offer(user, reason = null) {
        // Check last sacrifice time
        const lastSacSecs = await this.getLastSacrificeSecs(user.id);
        
        // If happened within past week, prevent.
        const lastWeek = COOP.TIME._secs() - ((60 * 60) * 24) * 7;

        // Ignore null lastSacSecs, these players have never been sacrificed before... no reason not to choose them. :D
        if (lastSacSecs >= lastWeek) {
            const sparedText = `${user.username} was considered for sacrifice but spared.`;
            return COOP.CHANNELS._send('ACTIONS', sparedText);
        }

        // If there is a previous sacrifice and the user still has prospect role (implies survived) remove role.
        if (lastSacSecs && ROLES._idHasCode(user.id, 'PROSPECT')) {
            await ROLES._remove(user.id, 'PROSPECT');

            const deprospectedText = `${user.username} survived their last sacrifice and is no longer considered a prospect`;
            return COOP.CHANNELS._send('ACTIONS', deprospectedText);
        }

        // Show some basic user statistics on the sacrifice message.
        let lastMessageFmt = 'unknown';

        // Try to access and format last_msg_secs data.v
        const lastMsgSecs = await COOP.USERS.getField(user.id, 'last_msg_secs');
        if (lastMsgSecs) lastMessageFmt = COOP.TIME.secsLongFmt(lastMsgSecs);

        // const points = await Items.getUserItemQty(user.id, 'COOP_POINT');
        // const totalItems = await COOP.ITEMS.getUserTotal(user.id);

        const cooperMood = await CooperMorality.load();

        let moodText = '';
        const tenRoll = COOP.STATE.CHANCE.bool({ likelihood: 6 });
        const twentyRoll = COOP.STATE.CHANCE.bool({ likelihood: 4 });
        const twoRoll = COOP.STATE.CHANCE.bool({ likelihood: 2 });
        const oneRoll = COOP.STATE.CHANCE.bool({ likelihood: 1 });

        if (tenRoll && cooperMood === 'EVIL') moodText = ' (and I hope you are)';
        if (twentyRoll && cooperMood === 'EVIL') moodText = ' lol';
        if (twoRoll && cooperMood === 'EVIL') moodText = ' (been looking forward to this one)';
        if (oneRoll && cooperMood === 'EVIL') moodText = ', ha';

        if (tenRoll && cooperMood === 'GOOD') moodText = ' (and I hope they don\'t)';
        if (twentyRoll && cooperMood === 'GOOD') moodText = ' ;(';
        if (twoRoll && cooperMood === 'GOOD') moodText = ' nooooooooo';
        if (oneRoll && cooperMood === 'GOOD') moodText = ' violence never solved anything.';

        if (tenRoll && cooperMood === 'NEUTRAL') moodText = ' it\'s a shame it had to come to this.';
        if (twentyRoll && cooperMood === 'NEUTRAL') moodText = ' this is Coop standard HR practise';
        if (twoRoll && cooperMood === 'NEUTRAL') moodText = ' it is what it is';
        if (oneRoll && cooperMood === 'NEUTRAL') moodText = ' just awaiting the paperwork';
        if (oneRoll && twentyRoll && cooperMood === 'NEUTRAL') moodText = ' all sacrificial rights reserved, The Coop';

        // const isProspect = ROLES._idHasCode(user.id, 'PROSPECT');

        // Start the poll, should save message ID for later results consideration.
        const msg = await COOP.CHANNELS._getCode('TALK').send({
            content: `<@${user.id}>`,
            poll: {
                question: { text: `${user.username} was ${!reason ? 'randomly ': ''} selected for sacrifice...` },
                answers: [
                    { text: `Keep them`, emoji: '🕊️' },
                    { text: `Sacrifice them`, emoji: '🗡️' },
                ],
                duration: 24,
                allow_multiselect: false
            }
        });

        TemporaryMessages.add(msg, sacrificeMsgLifetime, 'SACRIFICE');

        // Save the poll message link
        const msgLink = MESSAGES.link(msg);
        
        // Update the user's latest recorded sacrifice time.
        await COOP.USERS.updateField(user.id, 'last_sacrificed_secs', COOP.TIME._secs());

        return true;
    };

    // Sacrifice random member if less than five people are being sacrificed and the member exists
    static async random() {
        try {
            // Select a member at random.
            const member = await COOP.USERS.random();

            // Access the sacrifice channel for sacrifice data.
            
            // const sacrificeChannel = COOP.CHANNELS._getCode('TALK');

            // TODO: Store in sacrifice table and load instead.

            // const sacrificeOffers = await sacrificeChannel.messages.fetch({ limit: 3 });

            // If space for another offer, offer one.
            // if (member && sacrificeOffers.size <= 3) 

            this.offer(member.user);

        } catch(e) {
            console.log('Error sacrificing random member!');
            console.error(e);
        }
    };

    // Last sacrifice time, last updated, how it works, current dagger/shield count.
    static async announce() {
        const reqSacrificeVotes = VotingHelper.getNumRequired(SACRIFICE_RATIO_PERC);
        const sacrificeOffers = await this.loadOffers();
        const sacrifices = await Promise.all(sacrificeOffers.map(async offer => {
            let sacrificee = null;
            let hasFinalised = null;
            let shouldSacrifice = null;
            try {
                // Access the message
                const message = await MESSAGES.getByLink(offer.message_link);
                // If the offer no longer exists, clean it up and return default values
                if (!message && offer.message_link) {
                    TemporaryMessages.unregisterTempMsgByLink(offer.message_link);
                    return {
                        sacrificee: sacrificee,
                        hasFinalised: false,
                        shouldSacrifice: false,
                        messageLink: offer.message_link
                    };
                } 

                // Extract user id from the message content
                const discordID = message.content.match(/<@(\d+)>/)[1];
                sacrificee = USERS._get(discordID);

                hasFinalised = message.poll.resultsFinalized;

                const results = message.poll.answers.map((answer) => ({
                    answer_id: answer.answer_id,
                    votes: answer.votes
                }));

                const highestVotedAnswer = results.reduce((max, answer) => 
                    answer.votes > max.votes ? answer : max, { votes: 0 }
                );

                // If the highest voted answer is the "sacrifice" option
                // and if there are enough votes
                // then should sacrifice user
                shouldSacrifice = (highestVotedAnswer.answer_id == 2 && highestVotedAnswer.votes >= reqSacrificeVotes) ? true : false;
            } catch(e) {
                console.error(e);
                console.log('sacrifice announce failed with above errors');
            }

            return {
                sacrificee: sacrificee,
                hasFinalised: hasFinalised,
                shouldSacrifice: shouldSacrifice,
                messageLink: offer.message_link
            };
        }));

        // Valid sacrifices should contain the ongoing sacrifices?
        const validSacrifices = sacrifices.filter(v => v.sacrificee !== null && v.hasFinalised && v.shouldSacrifice && v.messageLink);

        // If there are sacrifices update the server about it.
        if (validSacrifices.length > 0) {
            // const announceTitle = `**${EMOJIS.DAGGER}${EMOJIS.DAGGER} The Coop Sacrifice Ritual:**\n\n`;
            // const announceContent = announceTitle + 
            //     'Work in progress...\n\n' +
            //     'Add number of sacrifices ongoing and link to vote';
            // // await COOP.CHANNELS._send('TALK', announceContent);

            const msg = await COOP.CHANNELS._send('TALK', 'https://cdn.discordapp.com/attachments/902593785500946472/1056733990280765500/sacrifice-ritual.png');
            msg.edit({ 
                components: [
                    new ActionRowBuilder().addComponents([
                        new ButtonBuilder()
                        .setEmoji('🗡')
                        .setLabel("Vote!")
                        .setURL(COOP.CHANNELS.link('TALK'))
                        .setStyle(ButtonStyle.Link),
                        new ButtonBuilder()
                            .setEmoji('📖')
                            .setLabel("Guide?")
                            .setURL("https://www.thecoop.group/guide/sacrifice")
                            .setStyle(ButtonStyle.Link)
                    ])
                ]
            });

        }
    };
    
};