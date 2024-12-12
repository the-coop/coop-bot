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
		// Blockchain confirmation will take longer than 3 seconds.
		await interaction.deferReply({ ephemeral: true });

		const item = interaction.options.get('item_code').value;
		const quantity = parseInt(interaction.options.get('quantity').value);

		const config = ITEMS_CONFIG?.[item];

		// Check valid item.
		if (!config)
			return interaction.editReply({ content: 'Invalid item.', ephemeral: true });

		// Check valid quantity.
		if (!isNaN(quantity) && quantity < 1)
			return interaction.editReply({ content: 'Invalid quantity', ephemeral: true });

		// Load user and check that they have a wallet.
		const id = interaction.user.id;
		const user = await USERS.loadSingle(id);
		if (!user?.wallet)
			return interaction.editReply({ content: 'Please try /wallet (add address first).', ephemeral: true });

		// Check if the item is minted.
		if (!config?.assetID)
			return interaction.editReply({ content: 'Item not minted yet, remind leaders', ephemeral: true });

		// Check they have gold coin and item.
		const hasGold = await Items.hasQty(id, 'GOLD_COIN', 1);
		const hasItemQty = await Items.hasQty(id, item, quantity);
		if (!hasGold || !hasItemQty)
			return interaction.editReply({ content: `Transfer requires 1xGOLD_COIN and ${quantity}x${item}`, ephemeral: true });

		// Subtract gold coin and items from user.
		await Items.subtract(id, 'GOLD_COIN', 1);
		await Items.subtract(id, item, quantity);

		console.log(user);
		console.log(config);
		
		const result = await AlgoHelper.release(user.wallet, parseInt(config.assetID), quantity);
		console.log(result);

		// TODO: Ideally return transaction id/link so they can check it.

		return interaction.editReply({ content: 'Export work in progress..', ephemeral: true });

	} catch(e) {
		console.error(e);
		console.log('Error exporting item');
		return interaction.editReply({ content: 'Error exporting item.', ephemeral: true });
	}
};