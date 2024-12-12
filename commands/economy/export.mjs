import { SlashCommandBuilder } from "discord.js";
import AlgoHelper from '../../operations/minigames/medium/economy/blockchain/AlgoHelper.mjs';
import InteractionHelper from '../../operations/activity/messages/interactionHelper.mjs';
import { ITEMS as ITEMS_CONFIG } from 'coop-shared/config.mjs';
import { ITEMS, USERS } from '../../coop.mjs';
import Items from 'coop-shared/services/items.mjs';

export const name = 'export';

export const description = 'Export items to Algorand blockchain.';

export const data = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
	.addStringOption(option => 
		option
			.setName('item_code')
			.setDescription('ITEM_CODE to export?')
			.setRequired(true)
	)
	.addIntegerOption(option => 
		option
			.setName('quantity')
			.setDescription('Quantity of item to export?')
	);

export const execute = async interaction => {
	try {
		const item = interaction.options.get('item_code').value;
		const quantity = parseInt(interaction.options.get('quantity').value);

		const config = ITEMS_CONFIG?.[item];

		// Check valid item.
		if (!config)
			return interaction.reply({ content: 'Invalid item.', ephemeral: true });

		// Check valid quantity.
		if (!isNaN(quantity) && quantity < 1)
			return interaction.reply({ content: 'Invalid quantity', ephemeral: true });

		// Load user and check that they have a wallet.
		const id = interaction.user.id;
		const user = await USERS.loadSingle(id);
		if (!user?.wallet)
			return interaction.reply({ content: 'Please try /wallet (add address first).', ephemeral: true });

		// Check if the item is minted.
		if (!config?.assetID)
			return interaction.reply({ content: 'Item not minted yet, remind leaders', ephemeral: true });

		// Check they have gold coin and item.
		const hasGold = await Items.hasQty(id, 'GOLD_COIN', 1);
		const hasItemQty = await Items.hasQty(id, item, quantity);
		if (!hasGold || !hasItemQty)
			return interaction.reply({ content: `Transfer requires 1xGOLD_COIN and ${quantity}x${item}`, ephemeral: true });

		// Subtract gold coin and items from user.
		await Items.subtract(id, 'GOLD_COIN', 1);
		await Items.subtract(id, item, quantity);

		console.log(user);
		
		const result = await AlgoHelper.release(user.wallet, config.assetID, quantity);
		console.log(result);

		// TODO: Ideally return transaction id/link so they can check it.

		return interaction.reply({ content: 'Export work in progress..', ephemeral: true });

	} catch(e) {
		console.error(e);
		console.log('Error exporting item');
		return interaction.reply({ content: 'Error exporting item.', ephemeral: true });
	}
};