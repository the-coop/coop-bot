import { usedOwnedUsableGuard } from '../../itemCmdGuards.mjs';
import COOP, { USERS } from '../../../../../../coop.mjs';
import Items from 'coop-shared/services/items.mjs';

export default class ChristmasEggHandler {
    
    static async effect(msgRef, user, target = null) {
        const subject = target ? target : user;
        
        // Calculate reward.
        const rewardBase = await COOP.ITEMS.perBeak('COOP_POINT');
        const reward = parseInt(rewardBase * .25);

        // Add the points to the user.
        await Items.add(subject.id, 'COOP_POINT', reward, 'Christmas egg effect');

        // Add feedback.
        const coopEmoji = COOP.MESSAGES.emojiCodeText('COOP_POINT');
        const eggEmoji = COOP.MESSAGES.emojiCodeText('CHRISTMAS_EGG');
        const optTarget = target ? ` on <@${target.id}>` : '';
        const feedbackText = `**${eggEmoji.repeat(2)} ${user.username} used their Christmas egg${optTarget}!**\n\n` +
            `They gained ${reward}x${coopEmoji} (25% of the average CP per beak (${rewardBase}))!`;

        COOP.CHANNELS.silentPropagate(msgRef, feedbackText, 'ACTIONS');
    }

    static async use(msgRef, user) {       
        // Apply multi-guard for usable item, owned, and consumed for this action.
        const used = await usedOwnedUsableGuard(user, 'CHRISTMAS_EGG', 1, msgRef);
        if (!used) return false;

        this.effect(msgRef, user);
    }
   
    static async onReaction({ emoji, message }, user) {
        // Prevent Cooper from using easter eggs?
        if (USERS.isCooper(user.id)) return false;
        if (emoji.name !== 'christmas_egg') return false;

        const used = await usedOwnedUsableGuard(user, 'CHRISTMAS_EGG', 1, message);
        if (!used) return false;

        this.effect(message, user, message.author);
    }

    static isChristmas() {
        return(new Date()).getMonth() === 11;
    }

    static async run() {
        // Only spawn on easter
        if (this.isChristmas()) 
            COOP.ITEMS.drop(COOP.CHANNELS._getCode('TALK'), 'CHRISTMAS_EGG', 30);
    }

}