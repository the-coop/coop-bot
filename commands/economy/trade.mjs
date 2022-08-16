import _ from 'lodash';
import { SlashCommandBuilder } from "@discordjs/builders";

import { 
	validItemQtyArgFloatGuard
} from '../../operations/minigames/medium/economy/itemCmdGuards.mjs';

import COOP, { MESSAGES, USABLE } from '../../organisation/coop.mjs';
import TradingHelper from '../../operations/minigames/medium/economy/items/tradingHelper.mjs';

// import TradingHelper from '../../operations/minigames/medium/economy/items/tradingHelper.mjs';

// import CoopCommand from '../../operations/activity/messages/coopCommand.mjs';
// import COOP from '../../organisation/coop.mjs';

// import TradingHelper from '../../operations/minigames/medium/economy/items/tradingHelper.mjs';

// import CoopCommand from '../../operations/activity/messages/coopCommand.mjs';
// import COOP from '../../organisation/coop.mjs';


// TODO: Move to Reactions/Message helper.
const userDesiredReactsFilter = (emojis = []) =>
	({ emoji }, user) => emojis.includes(emoji.name) && !COOP.USERS.isCooper(user.id)

export const name = 'trade';

export const description = 'Manage your item trades';

export const data = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)

		// Create trade subcommand.
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Create a trade.')

					.addStringOption(option => 
						option
							.setName('offer_item')
							.setDescription('ITEM_CODE to offer in trade?')
							.setRequired(true)
					)
					.addStringOption(option => 
						option
							.setName('receive_item')
							.setDescription('ITEM_CODE to receive in trade?')
							.setRequired(true)
					)
					.addIntegerOption(option => 
						option
							.setName('offer_qty')
							.setDescription('Quantity of item to gift?')
					)
					.addIntegerOption(option => 
						option
							.setName('receive_qty')
							.setDescription('Quantity of item to receive?')
					)
		)
		// Accept trade subcommand.
		.addSubcommand(subcommand =>
			subcommand
				.setName('accept')
				.setDescription('Accept a trade.')
					.addIntegerOption(option => 
						option
							.setName('trade_id')
							.setDescription('Trade ID # to accept')
							.setRequired(true)
					)
		)
		// Cancel trade subcommand.
		.addSubcommand(subcommand =>
			subcommand
				.setName('cancel')
				.setDescription('Cancel a trade.')
					.addIntegerOption(option => 
						option
							.setName('trade_id')
							.setDescription('Trade ID # to cancel')
							.setRequired(true)
					)
		);


export const execute = async (interaction) => {
	const action = interaction.options.getSubcommand();

	if (action === 'create') return await createTrade(interaction);
	if (action === 'cancel') return await tradeCancel(interaction);
	if (action === 'accept') return await tradeAccept(interaction);
	
	return await interaction.reply({ content: 'Trading action failed.', ephemeral: true });
};

const createTrade = async interaction => {
	const offerItemCodeInput = interaction.options.get('offer_item').value;
	const receiveItemCodeInput = interaction.options.get('receive_item').value;
	const offerQty = _.get(interaction.options.get('offer_qty'), 'value', 1);
	const receiveQty = _.get(interaction.options.get('receive_qty'), 'value', 1);

	// Acknowledge but let rest of function handle confiramtion.
	interaction.reply({ content: 'Please confirm trade creation!', ephemeral: true });

	// TODO: Could potentially allow others to take the same trade with this. GME FTW.
	// TODO: Support moving all personal confirmations to DM.
	// TODO: Provide a more useful error message here with qty details.

	try {
		const tradeeID = interaction.user.id;
		const tradeeName = interaction.user.username;

		// Try to parse item codes.
		const offerItemCode = COOP.ITEMS.interpretItemCodeArg(offerItemCodeInput);
		const receiveItemCode = COOP.ITEMS.interpretItemCodeArg(receiveItemCodeInput);

		// Check if valid item codes given.
		if (!offerItemCode || !receiveItemCode) 
			return COOP.MESSAGES.selfDestruct(
				interaction.channel, 
				`Invalid item codes for trade, ${offerItemCode} ${receiveItemCode}`, 0, 7500
			);

		// Guard against bad/negative amounts for both qtys
		if (
			!validItemQtyArgFloatGuard(interaction.channel, interaction.user, offerQty) || 
			!validItemQtyArgFloatGuard(interaction.channel, interaction.user, receiveQty)
		)
			return null;

		// Check if user can fulfil the trade.
		const canUserFulfil = await COOP.ITEMS.hasQty(tradeeID, offerItemCode, offerQty);
		if (!canUserFulfil) return COOP.MESSAGES.selfDestruct(interaction.channel, `Insufficient item quantity for trade.`, 0, 7500);

		// Get their existing trades to check slots.
		const ownerExistingTrades = await TradingHelper.getByTrader(tradeeID);
		if (ownerExistingTrades.length > 5)
			return COOP.MESSAGES.selfDestruct(interaction.channel, `Insufficient available trade slots ${ownerExistingTrades.length}/5.`, 0, 7500);

		// Generate strings with emojis based on item codes.
		const tradeAwayStr = `${COOP.MESSAGES.emojiCodeText(offerItemCode)}x${offerQty}`;
		const receiveBackStr = `${COOP.MESSAGES.emojiCodeText(receiveItemCode)}x${receiveQty}`;
		const exchangeString = `<- ${tradeAwayStr}\n-> ${receiveBackStr}`;

		// Check if there is an existing offer matching this specifically.
		const matchingOffers = await TradingHelper
			.matches(receiveItemCode, offerItemCode, receiveQty, offerQty);

		// Build the confirmation message string.
		let confirmStr = `**<@${tradeeID}>, trade away ` +
			`${tradeAwayStr} in return for ${receiveBackStr}?** \n\n` +
			exchangeString;
			
		if (matchingOffers.length > 0) 
			confirmStr += `\n\n_Matching offers detected._`;

		// Post the confirmation message and add reactions to assist interaction.
		const confirmMsg = await COOP.MESSAGES.selfDestruct(interaction.channel, confirmStr, 0, 30000);
		COOP.MESSAGES.delayReact(confirmMsg, '❎', 666);
		COOP.MESSAGES.delayReact(confirmMsg, '✅', 999);

		// Setup the reaction collector for trade confirmation interaction handling.
		const interactions = await confirmMsg.awaitReactions(
			userDesiredReactsFilter(['❎', '✅']), 
			{ max: 1, time: 30000, errors: ['time'] }
		);

		// Check reaction is from user who asked, if restricting confirmation to original.
		const confirmation = interactions.reduce((acc, { emoji, users }) => {
			// TODO: Refactor this line to Reaction helper
			const userReacted = users.cache.has(tradeeID);
			if (emoji.name === '✅' && userReacted) return acc = true;
			else return acc;
		}, false);

		// Trade cancelled, remove message.
		if (!confirmation)
			return COOP.MESSAGES.delayDelete(confirmMsg);

		// Accept cheapest matching offer.
		if (matchingOffers.length > 0) {
			// Sort offers by most offer (highest offer) qty amongst matches.
			matchingOffers.sort((a, b) => a.offer_qty > b.offer_qty);

			// Select highest offer.
			const cheapest = matchingOffers[0];

			// Let helper handle accepting of the trade, with a interaction.channelRef.
			const tradeAccepted = await TradingHelper.accept(cheapest.id, tradeeID, tradeeName);
			if (tradeAccepted) {
				const exchangeString = `-> ${tradeAwayStr}\n<- ${receiveBackStr}`;
				const tradeConfirmStr = `**${tradeeName} accepted trade #${cheapest.id} from ${cheapest.trader_username}**\n\n` +
					exchangeString;
				
				// If passed a message reference, handle interaction feedback.
					// Refactor this hash string into channelsHelper?
					const actionsLinkStr = `\n\n_View in <#${COOP.CHANNELS.textRef('TRADE')}>_`;

					// Post accepted trade to channel and record channel.
					COOP.MESSAGES.delayEdit(confirmMsg, tradeConfirmStr + actionsLinkStr, 333);
			} else {
				// Edit failure onto message.
				COOP.MESSAGES.selfDestruct(confirmMsg, 'Failure confirming instant trade.', 666, 5000);
			}

		} else {
			// Use the items to create a trade, so we can assume its always fulfillable,
			//  the item becomes a trade credit note, can be converted back.
			const didUse = await USABLE.use(tradeeID, offerItemCode, offerQty);
			if (didUse) {
				const trade = await TradingHelper.create(
					tradeeID, tradeeName,
					offerItemCode, receiveItemCode,
					offerQty, receiveQty
				);

				// Remove the original message now to simplify the UI.
				COOP.MESSAGES.delayDelete(confirmMsg, 999);

				// Offer feedback for trade creation. :)
				const tradeText = `**${tradeeName} created trade #${trade.id}**\n\n` +
					exchangeString + `\n\n` +
					`Use _trade accept_ slash command to accept this trade or react with :handshake:._`;

				// Send confirmation in channel as feedback.
				const confirmationMsg = await interaction.channel.send(tradeText);
				
				COOP.CHANNELS._send('TRADE', tradeText);

				// Indicate it is a trade relevant message with money bag emoji.
				MESSAGES.delayReact(confirmationMsg, '💰');
				
				// Add reaction to accept trade.
				MESSAGES.delayReact(confirmationMsg, '🤝');

				// TODO: Add to trade stats.
				// TODO: Add reaction to cancel trade.
				
			} else {
				COOP.MESSAGES.selfDestruct(confirmMsg, 'Error creating trade.', 666, 5000);
			}
		}
		
	} catch(e) {
		console.log('Failed to trade item.');
		console.error(e);
	}
};



const tradeAccept = async interaction => {
	// Sanitise + validate input a little before processing.
	const tradeIDOption = interaction.options.get('trade_id').value;
	const tradeID = parseInt(tradeIDOption);

	try {
		const tradeeID = interaction.user.id;
		const tradeeName = interaction.user.username;

		// Check if valid trade ID given.
		const trade = await TradingHelper.get(tradeID);
		if (!trade) return COOP.MESSAGES.selfDestruct(interaction.channel, `Invalid trade ID - already sold?`, 0, 5000);
		
		// Check if user can fulfil the trade.
		const hasEnough = await COOP.ITEMS.hasQty(tradeeID, trade.receive_item, trade.receive_qty);
		if (!hasEnough) return COOP.MESSAGES.selfDestruct(interaction.channel, `Insufficient offer quantity for trade.`, 0, 5000);

		// Let helper handle accepting logic as it's used in multiple places so far.
		const tradeAccepted = await TradingHelper.accept(tradeID, tradeeID, tradeeName);
		if (tradeAccepted) {
			COOP.MESSAGES.selfDestruct(interaction.channel, 'Trade accepted.', 0, 10000);
		} else {
			// Log cancelled trades
			COOP.MESSAGES.selfDestruct(interaction.channel, 'Trade could not be accepted.', 0, 5000);
			console.log('Trade accept failed');
		}
		
	} catch(e) {
		console.log('Failed to trade item.');
		console.error(e);
	}
}





const tradeCancel = async interaction => {
	// Sanitise + validate input a little before processing.
	const tradeIDOption = interaction.options.get('trade_id').value;
	const tradeID = parseInt(tradeIDOption);

	try {
		// More readable access to useful properties.
		const tradeeID = interaction.user.id;
		const tradeeName = interaction.user.username;

		// Check if valid trade ID given.
		const trade = await TradingHelper.get(tradeID);
		if (!trade) return COOP.MESSAGES.selfDestruct(interaction.channel, `Invalid # trade ID - already cancelled?`, 0, 5000);
		
		// Check if user can fulfil the trade.
		const isYours = trade.trader_id === tradeeID;
		if (!isYours) return COOP.MESSAGES.selfDestruct(interaction.channel, `Trade #${trade.id} is not yours to cancel.`, 0, 5000);

		// Let helper handle accepting logic as it's used in multiple places so far.
		const tradeCancelled = await TradingHelper.cancel(tradeID, tradeeName);
		if (tradeCancelled) {
			// Log cancelled trades
			COOP.MESSAGES.selfDestruct(interaction.channel, `Trade #${trade.id} cancelled.`, 0, 7500);
		} else {
			COOP.MESSAGES.selfDestruct(interaction.channel, `Trade #${trade.id} could not be cancelled.`, 0, 10000);
			console.log('Trade cancel failed');
		}
		
	} catch(e) {
		console.log('Failed to cancel trade.');
		console.error(e);
	}
}
