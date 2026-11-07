import STATE from "../../../state.mjs";

import COOP, { ITEMS, SERVER, USERS } from "../../../coop.mjs";

export default class Statistics {

    // Run on an interval to store server statistics.
    static processMemoryIntoStatistics() {
        // STATE.EVENTS_HISTORY
        // STATE.BOOST_HISTORY
        // STATE.JOIN_HISTORY

        // damage inflicted/items used/items crafted/items destroyed

        // STATE.MESSAGE_HISTORY
        // STATE.REACTION_HISTORY
    };

    // Ratio of top members currently active, clamped to [MIN_VELOCITY, MAX_VELOCITY].
    // Used to divide event intervals, so a quiet server slows events down (up to 1/MIN_VELOCITY times).
    static MIN_VELOCITY = 0.1;
    static MAX_VELOCITY = 1;

    static async calcCommunityVelocity() {
        let active = 0;
        const tophun = await USERS.loadTopHundredUsers();
        tophun.map(u => {
            const member = USERS._get(u.discord_id);
            // Presence status is a string, cached presences keep 'offline' (truthy), so check explicitly.
            // Idle members are treated as away, not active.
            const status = member?.presence?.status;
            if (status === 'online' || status === 'dnd') active++;
        });

        const velocity = active / Math.max(1, SERVER._count());

        return Math.min(this.MAX_VELOCITY, Math.max(this.MIN_VELOCITY, velocity));
    };

    // Use this to calculate and update community velocity.
    // TODO: Drop rates command and velocity command for comparison.
    static async offloadMessageStats() {
        // TODO: Count # messages
        // Bonus, if bigger author:messages ratio this is better((?))
        // Count # reactions
        // COOP.CHANNELS._postToChannelCode('TALK', 'Calculate community velocity? Based on? Messages, reactions, joins, boosts, missing any user-driven activity?')


        // If community velocity is higher than record, reward community
        // A rare crate, bonus eggs, etc.
    };

};