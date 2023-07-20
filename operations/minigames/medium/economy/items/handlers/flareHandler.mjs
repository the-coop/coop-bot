import CratedropMinigame from "../../../../small/cratedrop.mjs";

import { usedOwnedUsableGuard } from "../../itemCmdGuards.mjs";
import COOP, { STATE } from "../../../../../../coop.mjs";



export default class FlareHandler {

    static async use(interaction, user) {
        const used = await usedOwnedUsableGuard(user, 'FLARE', 1, interaction.channel);
        if (!used) return false;

        // Respond to usage result.
        const succeeded = STATE.CHANCE.bool({ likelihood: 45 });
        if (succeeded) CratedropMinigame.drop();

        const feedbackText = `${user.username} used a FLARE and ${succeeded ? 'successfully' : 'potentially'} triggered crate drop!`;

        // Reply to interaction
        return await interaction.reply({ content: feedbackText, ephemeral: false });
    }
   
}