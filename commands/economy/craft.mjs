import { SlashCommandBuilder } from "discord.js";
import COOP from '../../coop.mjs';
import { EMOJIS } from 'coop-shared/config.mjs';

import TemporaryMessages from "../../operations/activity/maintenance/temporaryMessages.mjs";
import SkillsHelper from '../../operations/minigames/medium/skills/skillsHelper.mjs';
import CraftingHelper from "../../operations/minigames/medium/skills/crafting/craftingHelper.mjs";

export const name = 'craft';

export const description = 'Craft an item from ingredients';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
		.addStringOption(option => 
			option
				.setName('item_code')
				.setDescription('Item code to craft?')
				.setRequired(true)
		)
		.addIntegerOption(option => 
			option
				.setName('qty')
				.setDescription('Craft how many?')
		);


export const execute = async interaction => {	
	try {
		// Cap the number at 0 minimum and refactor into a common guard/validator.
		const qtyInput = interaction.options.get('qty');
		const qty = qtyInput ? Math.max(qtyInput.value, 1) : 1;
	
		let itemCode = interaction.options.get('item_code').value;
		
		// Shorthand for feedback.
		const userID = interaction.user.id;

		// Check if emoji and handle emoji inputs.
		itemCode = COOP.ITEMS.interpretItemCodeArg(itemCode);

		// Check if input is a valid item code.
		if (!itemCode)
			return await COOP.INTERACTION.reply(interaction, `Cannot craft invalid item code (${itemCode}).`, 15000);

		// Check if item is craftable
		if (!CraftingHelper.isItemCraftable(itemCode))
			return await COOP.INTERACTION.reply(interaction, `${itemCode} is a valid item/code but uncraftable.`, 15000);

		// Access required crafting level for item.
		const craftingItem = CraftingHelper.CRAFTABLES[itemCode];

		// Check the user has a high enough crafting level.
		const crafterLevel = await SkillsHelper.getLevel('crafting', interaction.user.id);
		const reqLevel = craftingItem.levelReq;

		// Check user has sufficient level/exp.
		if (reqLevel > crafterLevel) {
			// TODO: Add emoji
			const lackLevelText = `<@${userID}> lacks level ${reqLevel} crafting required to make ${itemCode}`;
			return await COOP.INTERACTION.reply(interaction, lackLevelText, 15000);
		}

		// Check for ingredients and multiply quantities.
		const fulfillChecks = await CraftingHelper.canFulfilIngredients(userID, itemCode, qty);
		
		// Inform the crafter of what is missing.
		if (!fulfillChecks.craftable) {
			const insufficientIngredientsText = `Missing crafting supplies for ${qty}x${itemCode}:\n` +
				fulfillChecks.checks
					.filter(c => !c.sufficient)
					.map(c => `${COOP.MESSAGES.emojifyID(EMOJIS[c.item_code])} ${c.item_code} -${c.missing}`)
					.join('\n');
			
			return await COOP.INTERACTION.reply(interaction, insufficientIngredientsText, 15000);
		}

		// Attempt to craft the object.
		const craftResult = await CraftingHelper.craft(userID, itemCode, qty);
		if (craftResult) {
			const addText = `<@${userID}> crafted ${itemCode}x${qty}.`;

			return await COOP.INTERACTION.reply(interaction, addText, 15000);

		} else {
			return await COOP.INTERACTION.reply(interaction, `<@${userID}> failed to craft ${qty}x${itemCode}...`, 15000);
		}

	} catch(err) {
		console.log('Error crafting item.');
		console.error(err);
		return await COOP.INTERACTION.reply(interaction, `Error crafting item.`, 15000);
	}

};