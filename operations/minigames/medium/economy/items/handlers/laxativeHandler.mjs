import EggHuntMinigame from "../../../../small/egghunt.mjs";

import { usedOwnedUsableGuard } from "../../itemCmdGuards.mjs";
import COOP, { STATE, INTERACTION } from "../../../../../../coop.mjs";


export default class LaxativeHandler {

    static async use(interaction, user) {
        // Guard against usage, ensure they pay the price.
        const used = await usedOwnedUsableGuard(user, 'LAXATIVE', 1, interaction.channel);
        if (!used) 
            return await INTERACTION.reply(interaction, 'Failed to use LAXATIVE', 15000);

        // Attempt to run egg drop. :D
        const succeeded = STATE.CHANCE.bool({ likelihood: 40 });
        if (succeeded) EggHuntMinigame.run();

        // Add feedback.
        const feedbackText = `${user.username} used laxative and ${succeeded ? 'successfully' : 'potentially'} triggered egg drops!`;

        // Create record
        COOP.CHANNELS._send('ACTIONS', feedbackText);

        // Reply to interaction
        return await INTERACTION.reply(interaction, feedbackText, 15000);
    }
   
}