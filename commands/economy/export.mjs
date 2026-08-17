import { SlashCommandBuilder } from "discord.js";
import AlgoHelper from '../../operations/minigames/medium/economy/blockchain/AlgoHelper.mjs';
import AssetRegistry from '../../operations/minigames/medium/economy/blockchain/assetRegistry.mjs';
import { ITEMS as ITEMS_CONFIG, isExportable } from 'coop-shared/config.mjs';
import { USERS } from '../../coop.mjs';
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
			.setDescription('Quantity of item to export? (default 1)')
	);

// Fee the export costs on top of the items themselves.
const FEE_ITEM = 'GOLD_COIN';
const FEE_QTY = 1;

export const execute = async interaction => {
	const id = interaction.user.id;

	let item = null;
	let quantity = 1;
	let paid = false;

	try {
		// Blockchain confirmation will take longer than 3 seconds.
		await interaction.deferReply({ ephemeral: true });

		item = String(interaction.options.get('item_code').value).toUpperCase();

		// The option is optional, so .get() returns null when it is left out.
		const quantityInput = interaction.options.get('quantity')?.value;
		quantity = typeof quantityInput === 'undefined' || quantityInput === null
			? 1 : parseInt(quantityInput, 10);

		const config = ITEMS_CONFIG?.[item];

		// Check valid item.
		if (!config)
			return interaction.editReply({ content: 'Invalid item.', ephemeral: true });

		// The hierarchy offices stay in the database: whoever holds one holds the role, and
		// an election has to be able to take it back off them.
		if (!isExportable(item))
			return interaction.editReply({
				content: `${item} cannot leave The Coop, it is tied to your position here.`,
				ephemeral: true
			});

		// Check valid quantity. NaN has to be rejected too, it would reach the chain as an invalid amount.
		if (isNaN(quantity) || quantity < 1)
			return interaction.editReply({ content: 'Invalid quantity.', ephemeral: true });

		// Load user and check that they have a wallet.
		const user = await USERS.loadSingle(id);
		if (!user?.wallet)
			return interaction.editReply({ content: 'Please try /wallet (add address first).', ephemeral: true });

		// Check if the item is minted.
		const assetID = await AssetRegistry.get(item);
		if (!assetID)
			return interaction.editReply({ content: 'Item not minted yet, remind leaders.', ephemeral: true });

		// Check they have gold coin and item.
		const hasFee = await Items.hasQty(id, FEE_ITEM, FEE_QTY);
		const hasItemQty = await Items.hasQty(id, item, quantity);
		if (!hasFee || !hasItemQty)
			return interaction.editReply({ content: `Transfer requires ${FEE_QTY}x${FEE_ITEM} and ${quantity}x${item}`, ephemeral: true });

		// Everything below this point can fail on chain, so check what can be checked
		// while the user still has their items. Sending to a wallet that has not opted
		// in is rejected by the network and used to burn the items anyway.
		if (!await AlgoHelper.isOptedIn(user.wallet, assetID))
			return interaction.editReply({
				content: `Your wallet has not opted in to ${item} yet. Opt in to asset ${assetID} (${AlgoHelper.assetLink(assetID)}) and try again.`,
				ephemeral: true
			});

		// The treasury has to actually hold enough of the asset to pay out.
		const treasuryHolding = await AlgoHelper.holdingAmount(assetID);
		if (treasuryHolding < quantity)
			return interaction.editReply({
				content: `The Coop treasury only has ${treasuryHolding}x${item} left on chain, remind leaders to mint more.`,
				ephemeral: true
			});

		// Subtract fee and items from user.
		await Items.subtract(id, FEE_ITEM, FEE_QTY, 'Export fee');
		await Items.subtract(id, item, quantity, 'Exported to Algorand');
		paid = true;

		const { txID } = await AlgoHelper.release(user.wallet, assetID, quantity);

		return interaction.editReply({
			content: `Exported ${quantity}x${item} to ${user.wallet}.\n${AlgoHelper.txLink(txID)}`,
			ephemeral: true
		});

	} catch(e) {
		console.error(e);
		console.log('Error exporting item');

		// The transfer failed after the items were taken, so give them back rather
		// than leaving the user out of pocket with nothing on chain to show for it.
		if (paid) {
			try {
				await Items.add(id, item, quantity, 'Refund, failed export');
				await Items.add(id, FEE_ITEM, FEE_QTY, 'Refund, failed export');

				return interaction.editReply({
					content: `Error exporting ${item}, your items were refunded. Have you opted in?`,
					ephemeral: true
				});

			} catch(refundError) {
				console.error(refundError);
				console.log('Error refunding failed export');

				return interaction.editReply({
					content: `Error exporting ${item} and the refund also failed, tell leaders (${quantity}x${item} + ${FEE_QTY}x${FEE_ITEM}).`,
					ephemeral: true
				});
			}
		}

		return interaction.editReply({ content: 'Error exporting item, have you opted in?', ephemeral: true });
	}
};
