import { TextInputStyle, SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder } from "discord.js";

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
		const wallet = interaction.options.get('wallet').value;
	
		// Update the user with wallet address input.

		return interaction.reply({ content: 'Wallet command work in progress.', ephemeral: true });

	} catch(e) {
		console.error(e);
		console.log('Error setting up wallet.');
		return interaction.reply({ content: 'Error setting up wallet.', ephemeral: true });
	}
};
