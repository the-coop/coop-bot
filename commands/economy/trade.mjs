import _ from 'lodash';
import { SlashCommandBuilder } from "@discordjs/builders";
import Trading from 'coop-shared/services/trading.mjs';

import { 
	validItemQtyArgFloatGuard
} from '../../operations/minigames/medium/economy/itemCmdGuards.mjs';

import COOP, { MESSAGES, USABLE } from '../../coop.mjs';
import TradingHelper from '../../operations/minigames/medium/economy/items/tradingHelper.mjs';
import Items from 'coop-shared/services/items.mjs';
import Useable from 'coop-shared/services/useable.mjs';
import InteractionHelper from '../../operations/activity/messages/interactionHelper.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

// import TradingHelper from '../../operations/minigames/medium/economy/items/tradingHelper.mjs';

// import CoopCommand from '../../operations/activity/messages/coopCommand.mjs';
// import COOP from '../../coop.mjs';

// import TradingHelper from '../../operations/minigames/medium/economy/items/tradingHelper.mjs';

// import CoopCommand from '../../operations/activity/messages/coopCommand.mjs';
// import COOP from '../../coop.mjs';




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
							.setAutocomplete(true)
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
							.setAutocomplete(true)
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
	// interaction.reply({ content: 'Please confirm trade creation!', ephemeral: true });

	// TODO: Could potentially allow others to take the same trade with this. GME FTW.
	// TODO: Provide a more useful error message here with qty details.

	try {
		const tradeeID = interaction.user.id;
		const tradeeName = interaction.user.username;

		// Try to parse item codes.
		const offerItemCode = COOP.ITEMS.interpretItemCodeArg(offerItemCodeInput);
		const receiveItemCode = COOP.ITEMS.interpretItemCodeArg(receiveItemCodeInput);

		// Check if valid item codes given.
		if (!offerItemCode || !receiveItemCode) 
			return interaction.reply({ 
				content: `Invalid item codes for trade, ${offerItemCode} ${receiveItemCode}`, 
				ephemeral: true 
			});

		// Guard against bad/negative amounts for both qtys
		if (
			!validItemQtyArgFloatGuard(interaction.channel, interaction.user, offerQty) 
			|| 
			!validItemQtyArgFloatGuard(interaction.channel, interaction.user, receiveQty)
		)
			return null;

		// Check if user can fulfil the trade.
		const canUserFulfil = await Items.hasQty(tradeeID, offerItemCode, offerQty);
		if (!canUserFulfil)
			return interaction.reply({ content: `Insufficient item quantity for trade.`, ephemeral: true });

		// Get their existing trades to check slots.
		const ownerExistingTrades = await Trading.getByTrader(tradeeID);
		if (ownerExistingTrades.length > 5)
			return interaction.reply({ content: `Insufficient available trade slots ${ownerExistingTrades.length}/5.`, ephemeral: true });

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

		// Craft the confirmation message texts.
		const feedbackTexts = {
			preconfirmationText: confirmStr,
			confirmationText: 'Trade confirmed.',
			cancellationText: 'Cancelled trade, your items were returned.'
		};

		// Trade cancelled, remove message.
		const confirmation = await InteractionHelper.confirm(interaction, feedbackTexts);
		if (!confirmation) return await interaction.reply({ content: `Trade creation cancelled.`, ephemeral: true });

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
					return interaction.reply({ content: tradeConfirmStr + actionsLinkStr, ephemeral: true });

			} else {
				// Edit failure onto message.
				return interaction.reply({ content: 'Failure confirming instant trade.', ephemeral: true });
			}

		} else {
			// Use the items to create a trade, so we can assume its always fulfillable,
			//  the item becomes a trade credit note, can be converted back.
			const didUse = await Useable.use(tradeeID, offerItemCode, offerQty);
			if (didUse) {
				const trade = await Trading.create(
					tradeeID, tradeeName,
					offerItemCode, receiveItemCode,
					offerQty, receiveQty
				);

				// Offer feedback for trade creation. :)
				const tradeText = `**${tradeeName} created trade #${trade.id}**\n\n` + exchangeString;

				// Send confirmation in channel as feedback.
				const confirmationMsg = await interaction.channel.send(tradeText);
				confirmationMsg.edit({ components: [		
					new ActionRowBuilder().addComponents([
						new ButtonBuilder()
							.setCustomId('accept_trade')
							.setLabel('Accept')
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId('cancel_trade')
							.setLabel('Cancel')
							.setStyle(ButtonStyle.Danger),
						new ButtonBuilder()
							.setCustomId('create_trade')
							.setLabel('Create')
							.setStyle(ButtonStyle.Primary),
						new ButtonBuilder()
							.setLabel("Create")
							.setURL("https://www.thecoop.group/conquest/economy/trade")
							.setStyle(ButtonStyle.Link)
					])]
				});

				// TODO: Add to trade stats.
				
			} else {
				interaction.reply({ content: 'Error creating trade.', ephemeral: true });
			}
		}
		
	} catch(e) {
		console.log('Failed to trade item.');
		console.error(e);
	}
};


// TODO: Make sure 
// https://discordjs.guide/interactions/autocomplete.html#sending-results

const tradeAccept = interaction => {
	// Sanitise + validate input a little before processing.
	const tradeIDOption = interaction.options.get('trade_id').value;
	const tradeID = parseInt(tradeIDOption);
	return _tradeAccept(interaction, tradeID);
}

const tradeCancel = interaction => {
	// Sanitise + validate input a little before processing.
	const tradeIDOption = interaction.options.get('trade_id').value;
	const tradeID = parseInt(tradeIDOption);
	return _tradeCancel(interaction, tradeID);
}

export const _tradeAccept = async (interaction, tradeID) => {
	try {
		const tradeeID = interaction.user.id;
		const tradeeName = interaction.user.username;

		// Check if valid trade ID given.
		const trade = await Trading.get(tradeID);
		if (!trade)
			return interaction.reply(`Invalid trade ID - already sold?`);
		
		// Check if user can fulfil the trade.
		const hasEnough = await Items.hasQty(tradeeID, trade.receive_item, trade.receive_qty);
		if (!hasEnough)
			return interaction.reply({ content: `Insufficient offer quantity for trade.`, ephemeral: true });

		// Let helper handle accepting logic as it's used in multiple places so far.
		const tradeAccepted = await TradingHelper.accept(tradeID, tradeeID, tradeeName);
		if (tradeAccepted) {
			interaction.reply({ content: 'Trade accepted.', ephemeral: true });
		} else {
			// Log cancelled trades
			interaction.reply({ content: 'Trade could not be accepted.', ephemeral: true });
			console.log('Trade accept failed');
		}
		
	} catch(e) {
		console.log('Failed to trade item.');
		console.error(e);
	}
}

export const _tradeCancel = async (interaction, tradeID) => {
	try {
		// More readable access to useful properties.
		const tradeeID = interaction.user.id;
		const tradeeName = interaction.user.username;

		// Check if valid trade ID given.
		const trade = await Trading.get(tradeID);
		if (!trade) return interaction.reply(`Invalid # trade ID - already cancelled?`);
		
		// Check if user can fulfil the trade.
		const isYours = trade.trader_id === tradeeID;
		if (!isYours) return interaction.reply(`Trade #${trade.id} is not yours to cancel.`);

		// Let helper handle accepting logic as it's used in multiple places so far.
		const tradeCancelled = await TradingHelper.cancel(tradeID, tradeeName);
		if (tradeCancelled) {
			// Log cancelled trades
			interaction.reply(`Trade #${trade.id} cancelled.`);
		} else {
			interaction.reply(`Trade #${trade.id} could not be cancelled.`);
			console.log('Trade cancel failed');
		}
		
	} catch(e) {
		console.log('Failed to cancel trade.');
		console.error(e);
	}
}
