import { usedOwnedUsableGuard } from "../../itemCmdGuards.mjs";
import COOP, { STATE, INTERACTION } from "../../../../../../coop.mjs";
import WoodcuttingMinigame from "../../../../small/woodcutting.mjs";

export default class ChestnutHandler {

    static async use(interaction, user) {
        try {
            // Guard against usage, ensure they pay the price.
            const used = await usedOwnedUsableGuard(user, 'CHESTNUT', 1, interaction.channel);
            if (!used) 
                throw new Error('Failed to use');
    
            // Attempt to run egg drop. :D
            const succeeded = STATE.CHANCE.bool({ likelihood: 40 });
            if (succeeded) WoodcuttingMinigame.run();
    
            // Add feedback.
            const feedbackText = `${user.username} used chestnut and ${succeeded ? 'did' : 'failed to'} trigger woodcutting trees!`;
    
            // Create record
            COOP.CHANNELS._send('TALK', feedbackText);
    
            // Reply to interaction
            return await INTERACTION.reply(interaction, feedbackText, 15000);

        } catch(e) {
            // Error using item.
            return await INTERACTION.reply(interaction, 'Failed to use CHESTNUT', 15000);
        }
    }
   
};
