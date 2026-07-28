import _ from 'lodash';
import { CHANNELS, TIME, USERS, ROLES, MESSAGES } from "../../coop.mjs";
import EventsHelper from "../eventsHelper.mjs";

// How long the poll itself is open for (Discord takes poll durations in hours).
export const SPOTLIGHT_POLL_HOURS = 12;
export const SPOTLIGHT_POLL_DUR = 3600 * SPOTLIGHT_POLL_HOURS;

// How long the channel stays visible after the poll closes, so the result can be read.
export const SPOTLIGHT_DUR = 3600 * 24 * 1;

// One spotlight a week, timed from when it started.
export const SPOTLIGHT_FREQ = 3600 * 24 * 7;

export const RECONGITION_ROLE_CODES = ['BEGINNER', 'INTERMEDIATE', 'MASTER'];

export default class SpotlightHelper {

    static async track() {
        try {
            const spotlightEvent = await EventsHelper.read('spotlight');
            const now = TIME._secs();

            if (!spotlightEvent) throw new Error('Spotlight event not found in database!');

            const lastOccurred = parseInt(spotlightEvent.last_occurred) || 0;
            const isActive = spotlightEvent.active || false;
            const isDue = now - lastOccurred > SPOTLIGHT_FREQ;

            // An event runs in two stages: the poll, then a day of the result being readable.
            const pollClosed = now >= lastOccurred + SPOTLIGHT_POLL_DUR;
            const hasExpired = now >= lastOccurred + SPOTLIGHT_POLL_DUR + SPOTLIGHT_DUR;

            // The poll link is dropped once its result has been counted, so it doubles as
            // the marker for whether there is still a result waiting to be applied.
            const resultPending = !!spotlightEvent.message_link;

            console.log('Tracking spotlight event...');
            console.log(now);
            console.log(spotlightEvent);
            console.log(lastOccurred);

            // Start the event if necessary.
            if (!isActive && isDue)
                await this.start();

            // A day has passed since the result, hide the channel away again.
            // Checked before the result so a missed result can never hold the channel open.
            else if (isActive && hasExpired)
                await this.end();

            // Poll is over, apply and announce the result but leave the channel up to read.
            else if (isActive && pollClosed && resultPending)
                await this.result();

            // Process an ongoing event within
            else if (isActive)
                await this.run();

            else {
                console.log('Spotlight was tracked x hours until end/start [wip]...');
            }

        } catch(e) {
            console.log('Error tracking spotlight event');
            console.error(e);
        }
    };

    static async start() {
        try {
            // Show channel when ready
            CHANNELS._show(CHANNELS.config.SPOTLIGHT.id);

            // TODO: Add announcement ping
            CHANNELS._send('SPOTLIGHT', 'https://cdn.discordapp.com/attachments/723660447508725806/1246233648324153385/spotlight.png?ex=665ba507&is=665a5387&hm=925c941ac42cd03f79d213aca7475a37089125f00bd53811b6e85c5b66c6b8b5&');

            // Set event active and last occurrence to now.
            EventsHelper.update('spotlight', TIME._secs());
            EventsHelper.setActive('spotlight', true);

            // Select a member
            const user = await USERS._random();

            // Post spotlight member message.
            console.log('Starting spotlight event.');
            CHANNELS._send('SPOTLIGHT', `Need to create Spotlight Post Permission for one message - Starting spotlight for <@${user.discord_id}>`);

            // TODO: Calculate current role, above, and below.

            // console.log(user);
            // const member = USERS.getMemberByID(user.discord_id);

            // user
            // RECONGITION_ROLE_CODES
            const isBeginner = ROLES._idHasCode(user.discord_id, 'BEGINNER');
            const isIntermediate = ROLES._idHasCode(user.discord_id, 'INTERMEDIATE');
            const isMaster = ROLES._idHasCode(user.discord_id, 'MASTER');

            let promotion = 'INTERMEDIATE';
            let demotion = 'INTERMEDIATE';
            let current = 'BEGINNER';

            if (isBeginner) {
                demotion = null;
            }

            if (isIntermediate) {
                promotion = 'MASTER';
                demotion = 'BEGINNER';
                current = 'INTERMEDIATE';
            }

            if (isMaster) {
                promotion = null;
                current = 'MASTER';
            }

            console.log(isBeginner, isIntermediate, isMaster);

            // TODO: Start the poll, should save message ID for later results consideration.
            const poll = await CHANNELS._getCode('SPOTLIGHT').send({
                poll: {
                    question: { text: `Help evaluate ${user.username}'s rank:` },
                    answers: [
                        current !== 'MASTER' ? { text: `Promote up to ${promotion}`, emoji: '✅' } : null,
                        current !== 'BEGINNER' ? { text: `Demote down to ${demotion}`, emoji: '❌' } : null,
                        { text: `Stay at current rank ${current}`, emoji: '⚖️' },
                    ].filter(i => i),
                    duration: SPOTLIGHT_POLL_HOURS,
                    allow_multiselect: false
                }
            });

            // Save the poll message link
            const msgLink = MESSAGES.link(poll);
            EventsHelper.setLink('spotlight', msgLink);
            // Save the spotlight user as organizer
            EventsHelper.setOrganiser('spotlight', user.discord_id)

        } catch(e) {
            console.log('Error starting spotlight event');
            console.error(e);
        }
    };

    static async rankChange() {
        try {
            // Fetch spotlight event
            const spotlightEvent = await EventsHelper.read('spotlight');
            if (!spotlightEvent)
                throw new Error('Spotlight event could not be fetched!');

            // Access the poll results if available
            if (!spotlightEvent.message_link)
                throw new Error('Spotlight event does not have a valid message link!');

            const msg = await MESSAGES.getByLink(spotlightEvent.message_link);
            if (!msg)
                throw new Error('Spotlight message could not be fetched with the message link!');

            const results = msg.poll.answers.map((answer) => ({
                answer_id: answer.answer_id,
                votes: answer.votes
            }));

            const highestVotedAnswer = results.reduce((max, answer) => 
                answer.votes > max.votes ? answer : max, { votes: 0 }
            );
            
            const chosenActionId = highestVotedAnswer.answer_id;
        
            // Fetch the spotlight user from temporary storage
            if (!spotlightEvent.organiser)
                throw new Error('Spotlight event does not have a valid organiser!');

            const spotlightUser = await USERS._getById(spotlightEvent.organiser);

            if (!spotlightUser) {
                throw new Error('No spotlight user found for this event');
            }

            // Fetch user's current rank
            const isBeginner = await ROLES._idHasCode(spotlightUser.discord_id, 'BEGINNER');
            const isIntermediate = await ROLES._idHasCode(spotlightUser.discord_id, 'INTERMEDIATE');
            const isMaster = await ROLES._idHasCode(spotlightUser.discord_id, 'MASTER');

            let currentRank = 'BEGINNER';
            if (isIntermediate) currentRank = 'INTERMEDIATE';
            if (isMaster) currentRank = 'MASTER';

            if (chosenActionId === 1 && currentRank !== 'MASTER') {  // Promote
                let newRank = currentRank === 'BEGINNER' ? 'INTERMEDIATE' : 'MASTER';
                // Remove old rank
                ROLES._remove(spotlightUser.discord_id, currentRank);
                // Add new rank
                ROLES._add(spotlightUser.discord_id, newRank);
                CHANNELS._send('TALK', `${spotlightUser.username} has been promoted to ${newRank}.`);
    
            } else if (chosenActionId === 2 && currentRank !== 'BEGINNER') {  // Demote
                let newRank = currentRank === 'MASTER' ? 'INTERMEDIATE' : 'BEGINNER';
                // Remove old rank
                ROLES._remove(spotlightUser.discord_id, currentRank);
                // Add new rank
                ROLES._add(spotlightUser.discord_id, newRank);
                CHANNELS._send('TALK', `${spotlightUser.username} has been demoted to ${newRank}.`);
    
            } else {  // Stay at current rank
                CHANNELS._send('TALK', `${spotlightUser.username} stays at their current rank of ${currentRank}.`);
            }

            return true;

        } catch(e) {
            console.log('Error changing user rank in spotlight event');
            console.error(e);
            return false;
        }
    };

    // Poll has closed: count it, then leave the channel up for a day.
    static async result() {
        try {
            const applied = await this.rankChange();

            // Only drop the poll link once counted, an unreadable poll is retried until expiry.
            if (applied) await EventsHelper.setLink('spotlight', null);

            console.log('Spotlight poll closed, result ' + (applied ? 'applied' : 'could not be applied') + '.');

        } catch(e) {
            console.log('Error resolving spotlight event result');
            console.error(e);
        }
    };

    static async end() {
        try {
            // Catch up on the result if it never got counted (bot down while the poll closed).
            const spotlightEvent = await EventsHelper.read('spotlight');
            if (spotlightEvent?.message_link) await this.rankChange();

            // Set event to inactive.
            await EventsHelper.setActive('spotlight', false);

            // Reset properties
            await EventsHelper.setLink('spotlight', null);
            await EventsHelper.setOrganiser('spotlight', null);

            // Delete messages.
            const channel = CHANNELS._getCode('SPOTLIGHT');
            await channel.bulkDelete(100);

            // const msgs = await channel.messages.fetch({ limit: 100 });

            // Hide channel when not appropriate
            CHANNELS._hide(CHANNELS.config.SPOTLIGHT.id);
            
            console.log('Ending spotlight event.');

        } catch(e) {
            console.log('Error ending spotlight event');
            console.error(e);
        }
    };

    static async run() {
        try {
            console.log('Running active spotlight event, poll still open.');

        } catch(e) {
            console.log('Error runing spotlight event');
            console.error(e);
        }
    };

};