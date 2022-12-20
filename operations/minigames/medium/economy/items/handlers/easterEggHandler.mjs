import { usedOwnedUsableGuard } from '../../itemCmdGuards.mjs';
import COOP, { USERS } from '../../../../../../coop.mjs';
import Items from 'coop-shared/services/items.mjs';

export default class EasterEggHandler {
    
    static async effect(msgRef, user, target = null) {
        const subject = target ? target : user;
        
        // Calculate reward.
        const rewardBase = await COOP.ITEMS.perBeak('COOP_POINT');
        const reward = parseInt(rewardBase * .25);

        // Add the points to the user.
        await Items.add(subject.id, 'COOP_POINT', reward, 'Easter egg effect');

        // Add feedback.
        const coopEmoji = COOP.MESSAGES.emojiCodeText('COOP_POINT');
        const eggEmoji = COOP.MESSAGES.emojiCodeText('EASTER_EGG');
        const optTarget = target ? ` on <@${target.id}>` : '';
        const feedbackText = `**${eggEmoji.repeat(2)} ${user.username} used their easter egg${optTarget}!**\n\n` +
            `They gained ${reward}x${coopEmoji} (25% of the average CP per beak (${rewardBase}))!`;

        COOP.CHANNELS.silentPropagate(msgRef, feedbackText, 'ACTIONS');
    }

    static async use(msgRef, user) {       
        // Apply multi-guard for usable item, owned, and consumed for this action.
        const used = await usedOwnedUsableGuard(user, 'EASTER_EGG', 1, msgRef);
        if (!used) return false;

        this.effect(msgRef, user);
    }
   
    static async onReaction({ emoji, message }, user) {
        // Prevent Cooper from using easter eggs?
        if (USERS.isCooper(user.id)) return false;
        if (emoji.name !== 'easter_egg') return false;

        const used = await usedOwnedUsableGuard(user, 'EASTER_EGG', 1, message);
        if (!used) return false;

        this.effect(message, user, message.author);
    }

    // TODO: Consider getting a server time from somewhere to standardise all time?
    // TODO: Detect easter with last_easter detected column, that way can launch a message. :D
    static isEaster() {
        const dateNow = new Date();
        const year = dateNow.getFullYear();
        const century = Math.floor(year / 100);

        const goldenNum = year % 19;

        const nextCentury = year % 100;
        const quadrennial = Math.floor(century / 4); 
        const quadrennialYear = century % 4;

        // Relabel if feeling brave enough to annotate Gauss's Easter algorithm.
        const f = Math.floor((century + 8) / 25);
        const g = Math.floor((century - f + 1) / 3); 
        const startMonthOffset = (19 * goldenNum + century - quadrennial - g + 15) % 30;
        
        const i = Math.floor(nextCentury / 4);
        const k = nextCentury % 4;
        const l = (32 + 2 * quadrennialYear + 2 * i - startMonthOffset - k) % 7;
        const m = Math.floor((goldenNum + 11 * startMonthOffset + 22 * l) / 451);
        const n0 = (startMonthOffset + l + 7 * m + 114)
        
        // Check if easter.
        const easterMonth = Math.floor(n0 / 31) - 1;
        const easterDay = n0 % 31 + 1;
        const easterDate = new Date(year, easterMonth, easterDay);
        return (dateNow.getMonth() === easterDate.getMonth() 
            && dateNow.getDate() === easterDate.getDate());
    }

    static async run() {
        // Only spawn on easter
        if (this.isEaster()) 
            COOP.ITEMS.drop(COOP.CHANNELS._getCode('TALK'), 'EASTER_EGG', 30);
    }

}