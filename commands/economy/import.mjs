import { SlashCommandBuilder } from "discord.js";
import AlgoHelper from '../../operations/minigames/medium/economy/blockchain/AlgoHelper.mjs';
import InteractionHelper from '../../operations/activity/messages/interactionHelper.mjs';
import { ITEMS as ITEMS_CONFIG } from 'coop-shared/config.mjs';
import { ITEMS } from '../../coop.mjs';

export const name = 'import';

export const description = 'Import items via Algorand blockchain.';

export const data = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
	.addStringOption(option => 
		option
			.setName('transaction_id')
			.setDescription('Transaction ID')
			.setRequired(true)
	);

export const execute = async interaction => {
	try {
		const transaction = interaction.options.get('transaction').value;



		// Load item code from transaction

		return interaction.reply({ content: 'Import work in progress..', ephemeral: true });

	} catch(e) {
		console.error(e);
		console.log('Error importing item');
		return interaction.reply({ content: 'Error importing item.', ephemeral: true });
	}
};