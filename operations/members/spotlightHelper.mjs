import _ from 'lodash';
import { CHANNELS, TIME, USERS, ROLES, MESSAGES } from "../../coop.mjs";
import EventsHelper from "../eventsHelper.mjs";
import TemporaryMessages from '../activity/maintenance/temporaryMessages.mjs';

export const SPOTLIGHT_DUR = 3600 * 24 * 1;

export const RECONGITION_ROLE_CODES = ['BEGINNER', 'INTERMEDIATE', 'MASTER'];

export default class SpotlightHelper {

    static async track() {
        try {
            const spotlightEvent = await EventsHelper.read('spotlight');
            const now = TIME._secs();
            const lastOccurred = parseInt(spotlightEvent.last_occurred);
            const isDue = now - lastOccurred > (SPOTLIGHT_DUR * 7);
            const hasExpired = now - lastOccurred > SPOTLIGHT_DUR;

            // Defining a voting period allows channel to stay open for a while after concluding.
            const isVotingPeriod = lastOccurred + 3600 * 24 <= now;

            console.log('Tracking spotlight event...');
            console.log(now);
            console.log(spotlightEvent);
            console.log(lastOccurred);
            console.log(isVotingPeriod);

            // Start the event if necessary.
            if (!spotlightEvent.active && isDue)
                await this.start();

            // Process an ongoing event within
            else if (spotlightEvent.active && isVotingPeriod)
                await this.run();

            // End the event if necessary.
            else if (spotlightEvent.active && hasExpired)
                await this.end();

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
            CHANNELS._send('SPOTLIGHT', 'Need to create Spotlight Post Permission for one message - Starting spotlight for ' + user.username);

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
                    duration: 12,
                    allow_multiselect: false
                }
            });

            // Add to temporary messages to store message and user reference
            // The duration needs to be extended so that poll does not get deleted before end
            const duration = SPOTLIGHT_DUR * 1.1;
            TemporaryMessages.add(poll, duration, 'spotlight_poll');
            // Need to store the user id too
            const userIdMsg = await CHANNELS._getCode('SPOTLIGHT').send(`${user.discord_id}`)
            TemporaryMessages.add(userIdMsg, duration, 'spotlight_user')

        } catch(e) {
            console.log('Error starting spotlight event');
            console.error(e);
        }
    };

    static async rankChange() {
        try {
            // Access the poll results from message object
            const tempMessage = await TemporaryMessages.getType('spotlight_poll');
            const msg = await MESSAGES.getByLink(tempMessage[0].message_link);
            const results = msg.poll.answers.map((answer) => ({
                answer_id: answer.answer_id,
                votes: answer.votes // This might be wrong property, if it fails try voteCount instead
            }));

            const highestVotedAnswer = results.reduce((max, answer) => 
                answer.votes > max.votes ? answer : max, { votes: 0 }
            );
            
            const chosenActionId = highestVotedAnswer.answer_id;
        
            // Fetch the spotlight user from temporary storage
            const spotlightUserId = await TemporaryMessages.getType('spotlight_user');
            const userIdMsg = await MESSAGES.getByLink(spotlightUserId[0].message_link);
            const spotlightUser = await USERS._getById(userIdMsg.content);

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
                // TODO: Give user the new rank and remove old one
                CHANNELS._send('SPOTLIGHT', `${spotlightUser.username} has been promoted to ${newRank}.`);
    
            } else if (chosenActionId === 2 && currentRank !== 'BEGINNER') {  // Demote
                let newRank = currentRank === 'MASTER' ? 'INTERMEDIATE' : 'BEGINNER';
                // TODO: Give user the new rank and remove old one
                CHANNELS._send('SPOTLIGHT', `${spotlightUser.username} has been demoted to ${newRank}.`);
    
            } else {  // Stay at current rank
                CHANNELS._send('SPOTLIGHT', `${spotlightUser.username} stays at their current rank of ${currentRank}.`);
            }


        } catch(e) {
            console.log('Error changing user rank in spotlight event');
            console.error(e);
        }
    }

    static async end() {
        try {
            // Set event to inactive.
            EventsHelper.setActive('spotlight', false);

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
            console.log('Running active spotlight event within voting period.');

        } catch(e) {
            console.log('Error runing spotlight event');
            console.error(e);
        }
    };

};