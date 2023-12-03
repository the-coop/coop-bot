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
    }

    static async calcCommunityVelocity() {
        let velocity = 0;
        const tophun = await USERS.loadTopHundredUsers();
        tophun.map(u => {
            const member = USERS._get(u.discord_id);
            const connected = member?.presence?.status;
            if (connected) velocity++;
        });
        return velocity / SERVER._count();
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

        const roundedVel = await ITEMS.displayQty(await this.calcCommunityVelocity());
        const velocityText = `Community velocity is ${roundedVel}.`
        COOP.CHANNELS._tempSend('ACTIONS', velocityText, 0, 60000);
    }

}