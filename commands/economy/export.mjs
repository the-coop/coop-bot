import { SlashCommandBuilder } from "discord.js";
import AlgoHelper from '../../operations/minigames/medium/economy/blockchain/AlgoHelper.mjs';

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
		const itemCodeInput = interaction.options.get('item_code').value;
		const quantityInput = interaction.options.get('quantity');

		console.log(itemCodeInput);
		console.log(quantityInput);
	
		// TODO: Check they have a wallet.
	
		// TODO: Check if the item is minted.

		// TODO: Check they have gold coin and item.

		// TODO: Subtract gold coin.
	
		// TODO: Subtract item from user's inventory.

		// AlgoHelper.transfer

		return interaction.reply({ content: 'Export work in progress..', ephemeral: true });

	} catch(e) {
		console.error(e);
		console.log('Error exporting item');
		return interaction.reply({ content: 'Error exporting item.', ephemeral: true });
	}
};