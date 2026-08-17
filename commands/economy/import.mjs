import { SlashCommandBuilder } from "discord.js";
import AlgoHelper from '../../operations/minigames/medium/economy/blockchain/AlgoHelper.mjs';
import AssetRegistry from '../../operations/minigames/medium/economy/blockchain/assetRegistry.mjs';
import ImportLedger from '../../operations/minigames/medium/economy/blockchain/importLedger.mjs';
import { USERS } from '../../coop.mjs';
import Items from 'coop-shared/services/items.mjs';

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
	const id = interaction.user.id;

	let txID = null;
	let claimed = false;

	try {
		// Indexer lookup plus the database writes will take longer than 3 seconds.
		await interaction.deferReply({ ephemeral: true });

		// NB: this has to match the option name declared above, it used to read
		// 'transaction' and threw on every single invocation.
		txID = String(interaction.options.get('transaction_id').value).trim();

		if (!txID)
			return interaction.editReply({ content: 'Invalid transaction ID.', ephemeral: true });

		// Cheap pre-check for a friendlier message. The claim below is what actually
		// makes redeeming a transaction twice impossible.
		if (await ImportLedger.isClaimed(txID))
			return interaction.editReply({ content: 'That transaction has already been imported.', ephemeral: true });

		// The sender is matched against the user's registered wallet, so they need one.
		const user = await USERS.loadSingle(id);
		if (!user?.wallet)
			return interaction.editReply({ content: 'Please try /wallet (add address first).', ephemeral: true });

		const transaction = await AlgoHelper.lookupTransaction(txID);
		if (!transaction)
			return interaction.editReply({
				content: 'Transaction not found. Wait for it to confirm, then try again.',
				ephemeral: true
			});

		// Must be a confirmed asset transfer.
		const transfer = transaction.assetTransferTransaction;
		if (!transfer || !transaction.confirmedRound)
			return interaction.editReply({ content: 'That is not a confirmed asset transfer.', ephemeral: true });

		// Must have come from the wallet this user registered, otherwise anyone could
		// redeem somebody else's transfer by quoting its ID.
		if (transaction.sender !== user.wallet)
			return interaction.editReply({
				content: `That transaction was sent by ${transaction.sender}, not your registered wallet.`,
				ephemeral: true
			});

		// Must have been sent to the Coop treasury.
		const treasury = AlgoHelper.address();
		if (transfer.receiver !== treasury)
			return interaction.editReply({
				content: `That transfer went to ${transfer.receiver}, not the Coop treasury (${treasury}).`,
				ephemeral: true
			});

		// Must be an asset the Coop recognises as an item.
		const itemCode = await AssetRegistry.itemCodeOf(transfer.assetId);
		if (!itemCode)
			return interaction.editReply({
				content: `Asset ${transfer.assetId} is not a Coop item.`,
				ephemeral: true
			});

		// Opt-ins are zero-amount transfers to self and carry nothing to credit.
		const quantity = Number(transfer.amount);
		if (!quantity || quantity < 1)
			return interaction.editReply({ content: 'That transfer had no assets in it.', ephemeral: true });

		// Claim it before crediting: this is the point where a second /import for the
		// same transaction loses the race and gets nothing.
		claimed = await ImportLedger.claim(txID, id, itemCode, quantity);
		if (!claimed)
			return interaction.editReply({ content: 'That transaction has already been imported.', ephemeral: true });

		await Items.add(id, itemCode, quantity, 'Imported from Algorand');

		return interaction.editReply({
			content: `Imported ${quantity}x${itemCode}.\n${AlgoHelper.txLink(txID)}`,
			ephemeral: true
		});

	} catch(e) {
		console.error(e);
		console.log('Error importing item');

		// Crediting failed after the transaction was claimed, so unclaim it and let
		// them retry rather than stranding the assets they already sent in.
		if (claimed && txID) {
			try {
				await ImportLedger.release(txID);
			} catch(releaseError) {
				console.error(releaseError);
				console.log('Error releasing failed import claim');
			}
		}

		return interaction.editReply({ content: 'Error importing item.', ephemeral: true });
	}
};
