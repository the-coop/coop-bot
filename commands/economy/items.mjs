import { SlashCommandBuilder } from "@discordjs/builders";
import COOP, { USABLE } from '../../organisation/coop.mjs';
import { EMOJIS } from '../../organisation/config.mjs';

export const name = 'items';

export const description = 'Check item ownership';
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
	.addUserOption(option => 
		option
			.setName('target')
			.setDescription('Whose items? (default yours)')
	)
	.addStringOption(option => 
		option
			.setName('item_code')
			.setDescription('Item code? (default ALL)')
	);


export const execute = async (interaction) => {
	const itemCodeInput = interaction.options.get('item_code');
	const targetInput = interaction.options.get('target');

	const itemCode = itemCodeInput ? itemCodeInput.value : 'ALL';
	const target = targetInput ? targetInput.user : interaction.user;

	const websiteLink = `[See advanced details via website](<https://www.thecoop.group/members/${target.id}>)`

	// Try to interpret itemCode/itemEmoji arg
	const parsedItemCode = COOP.ITEMS.interpretItemCodeArg(itemCode);

	try {
		const name = target.username;

		// Retrieve all item counts that user owns.
		if (itemCode === 'ALL') {
			// Load all of the target's items.
			let items = await COOP.ITEMS.getUserItems(target.id);

			// Handle no item ownership situation.
			if (items.length === 0) 
				return await interaction.reply({ content: `${name} does not own any items.`, ephemeral: true });

			// Sort owned items by most first.
			items.sort((a, b) => (a.quantity < b.quantity) ? 1 : -1);

			// Crop items so a text overflow error does not happen.
			const slicedItems = items.slice(0, 5);

			// Format additional items text.
			let additionalItemsText = '';
			if (items.length > 5)
				additionalItemsText = `... plus ${items.length - 5} more items ...\n\n`;

			// Provide info and prompt to check website.;
			const itemDisplayMsg = COOP.ITEMS.formItemDropText(target, slicedItems);
			return await interaction.reply({ content: itemDisplayMsg + '\n' + additionalItemsText + websiteLink, ephemeral: true });
		}

		// Check if itemCode valid to use.
		if (!USABLE.isUsable(parsedItemCode))
			return await interaction.reply({ content: `${name}, ${parsedItemCode} seems invalid.`, ephemeral: true });

		// Check a specific item instead.
		const itemQty = await COOP.ITEMS.getUserItemQty(target.id, parsedItemCode);
		const displayQty = COOP.ITEMS.displayQty(itemQty);

		// Send specific item count.
		const emoji = COOP.MESSAGES.emojiText(EMOJIS[parsedItemCode]);
		if (itemQty > 0) {
			await interaction.reply({
				content: `${name} owns ${displayQty}x${parsedItemCode} ${emoji}.\n\n${websiteLink}`, 
				ephemeral: true 
			});
			return true;
		}
		else 
			return await interaction.reply({
				content: `${name} does not own any ${parsedItemCode}.`, 
				ephemeral: true 
			});

	} catch(err) {
		console.error(err);
		return await interaction.reply({ content: `Error getting item ownership info.`, ephemeral: true });
	}

};