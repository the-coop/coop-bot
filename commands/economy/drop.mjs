import { SlashCommandBuilder } from "@discordjs/builders";
import COOP, { STATE, USABLE } from '../../organisation/coop.mjs';
import { EMOJIS, RAW_EMOJIS } from '../../organisation/config.mjs';

import EggHuntMinigame from '../../operations/minigames/small/egghunt.mjs';

import { usedOwnedUsableGuard } from '../../operations/minigames/medium/economy/itemCmdGuards.mjs';

export const name = 'drop';

export const description = 'Drop one of your items';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
		.addStringOption(option => 
			option
				.setName('item_code')
				.setDescription('Item code to drop?')
				.setRequired(true)
		)


export const execute = async (interaction) => {	
	try {
		// Check if emoji and handle emoji inputs.
		let itemCode = interaction.options.get('item_code').value;
		itemCode = COOP.ITEMS.interpretItemCodeArg(itemCode);

		// Prevent drop in DMs.
		if (!interaction.channel)
			return await interaction.reply(`Please use /drop in server channel instead.`, { ephemeral: true });

		// Check item code is usable, was used, and valid with multi-guard.
		const used = await usedOwnedUsableGuard(interaction.user, itemCode, 1, interaction.channel);
		if (!used) return await interaction.reply({ content: 'Failed to drop item', ephemeral: true });

		// TODO: Don't allow in direct messages.
		
		// Drop the item based on its code.
		const dropMsg = await USABLE.drop(interaction.channel, itemCode);

		// Access item emoji.
		const emojiText = COOP.MESSAGES.emojiCodeText(itemCode);

		// High chance of egg breaking if dropped.
		const eggDrop = EggHuntMinigame.isEgghuntDrop(emojiText);
		const breakRoll = STATE.CHANCE.bool({ likelihood: 45 });
		if (eggDrop && breakRoll) {
			// Change the message text to indicate breakage.
			COOP.MESSAGES.delayEdit(dropMsg, `${interaction.user.username} broke ${emojiText} by dropping it, d'oh.`);

			// Clear the message.
			COOP.MESSAGES.delayDelete(dropMsg, 4444);
		}

		// TODO: Add to statistics.
		
		// Add success feedback message. (Could edit instead)
		return await interaction.reply({ 
			content: `${interaction.user.username} dropped ${itemCode} ${emojiText}`, 
			ephemeral: false 
		});
		
	} catch(err) {
		console.log('Error with drop command.');
		console.error(err);
		return await interaction.reply({ content: `Error dropping item.`, ephemeral: true });
	}

};