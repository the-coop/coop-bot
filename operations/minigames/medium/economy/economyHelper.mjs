import Useable from "coop-shared/services/useable.mjs";
import Items from "coop-shared/services/items.mjs";

import { USERS, MESSAGES, SERVER, CHANNELS, STATE, ITEMS } from "../../../../coop.mjs";
import { ActionRowBuilder, ButtonStyle, ButtonBuilder } from "discord.js";




export default class EconomyHelper {

    static async circulation() {
        const items = Useable.getUsableItems();
        const itemCode = STATE.CHANCE.pickone(items);

		const total = await Items.count(itemCode);
		const totalFmt = ITEMS.displayQty(total);

		const beaks = USERS.count(SERVER._coop(), false);
		const emoji = MESSAGES.emojiCodeText(itemCode);

		const avg = (total / beaks).toFixed(2);
		
		const statMessage = `**Economic circulation:**\n` +
			`${totalFmt}x${emoji} | _${avg} per beak_ | (${itemCode})`;

        const msg = await CHANNELS._send('TALK', statMessage);
        msg.edit({ components: [
            new ActionRowBuilder()
                .addComponents([
                    new ButtonBuilder()
                        .setLabel("More info")
                        .setURL('https://www.thecoop.group/conquest/economy/items/' + itemCode)
                        .setStyle(ButtonStyle.Link)
                ])
			]
		});
    }

}