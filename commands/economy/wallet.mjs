import { SlashCommandBuilder } from "discord.js";
import AlgoHelper from '../../operations/minigames/medium/economy/blockchain/AlgoHelper.mjs';
import { USERS } from '../../coop.mjs';

export const name = 'wallet';

export const description = 'Add/modify your wallet used for export and import.';

export const data = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
	.addStringOption(option =>
		option
			.setName('wallet')
			.setDescription('Wallet address to send to (check carefully)')
			.setRequired(true)
	);

export const execute = async interaction => {
	try {
		const id = interaction.user.id;
		const wallet = String(interaction.options.get('wallet').value).trim();

		// Checksummed 58 character Algorand address. /export sends real assets to
		// whatever is stored here, so a typo has to be caught now and not later.
		if (!AlgoHelper.isValidAddress(wallet))
			return interaction.reply({ content: 'That is not a valid Algorand address.', ephemeral: true });

		// Users have to exist in the database before a wallet can hang off them.
		const user = await USERS.loadSingle(id);
		if (!user)
			return interaction.reply({ content: 'You are not registered yet, try /help.', ephemeral: true });

		const previous = user.wallet || null;
		if (previous === wallet)
			return interaction.reply({ content: `Your wallet is already set to ${wallet}.`, ephemeral: true });

		await USERS.updateField(id, 'wallet', wallet);

		const action = previous ? `Wallet updated from ${previous} to` : 'Wallet set to';
		return interaction.reply({
			content: `${action} ${wallet}. Remember to opt in to an item's asset before exporting it.`,
			ephemeral: true
		});

	} catch(e) {
		console.error(e);
		console.log('Error setting up wallet.');
		return interaction.reply({ content: 'Error setting up wallet.', ephemeral: true });
	}
};
