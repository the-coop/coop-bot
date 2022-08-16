import { SlashCommandBuilder } from "@discordjs/builders";
import COOP from '../../organisation/coop.mjs';
import { EMOJIS } from '../../organisation/config.mjs';

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


export const execute = async (interaction) => {	
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
			return COOP.MESSAGES.selfDestruct(interaction.channel, `Cannot craft invalid item code (${itemCode}).`, 0, 5000);

		// Check if item is craftable
		if (!CraftingHelper.isItemCraftable(itemCode))
			return COOP.MESSAGES.selfDestruct(interaction.channel, `${itemCode} is a valid item/code but uncraftable.`, 0, 7500);

		// Access required crafting level for item.
		const craftingItem = CraftingHelper.CRAFTABLES[itemCode];

		// Check the user has a high enough crafting level.
		const crafterLevel = await SkillsHelper.getLevel('crafting', interaction.user.id);
		const reqLevel = craftingItem.levelReq;

		// Check user has sufficient level/exp.
		if (reqLevel > crafterLevel) {
			// TODO: Add emoji
			const lackLevelText = `<@${userID}> lacks level ${reqLevel} crafting required to make ${itemCode}`;
			return COOP.MESSAGES.selfDestruct(interaction.channel, lackLevelText, 0, 5000);
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
					
			return COOP.MESSAGES.selfDestruct(interaction.channel, insufficientIngredientsText, 0, 7500);
		}

		// Attempt to craft the object.
		const craftResult = await CraftingHelper.craft(userID, itemCode, qty);
		if (craftResult) {
			const addText = `<@${userID}> crafted ${itemCode}x${qty}.`;
			COOP.CHANNELS._send('ACTIONS', addText);
			return await interaction.reply({ content: addText, ephemeral: true });

		} else {
			COOP.MESSAGES.selfDestruct(interaction.channel, `<@${userID}> failed to craft ${qty}x${itemCode}...`, 0, 15000);
			return await interaction.reply({ content: 'Crafting failed.', ephemeral: true });
		}

	} catch(err) {
		console.log('Error crafting item.');
		console.error(err);
		return await interaction.reply({ 
			content: `Error crafting item.`, 
			ephemeral: true 
		});
	}

};