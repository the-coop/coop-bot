import { RAW_EMOJIS } from "coop-shared/config.mjs";
import { ITEMS, USABLE, USERS, CHANNELS, REACTIONS, CHICKEN, MESSAGES } from "../../../../../coop.mjs";

import Database from "coop-shared/setup/database.mjs";
import DatabaseHelper from "coop-shared/helper/databaseHelper.mjs";
import Trading from "coop-shared/services/trading.mjs";
import { ActionRowBuilder, ButtonStyle, ModalBuilder, SelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { ButtonBuilder } from "@discordjs/builders";


// TODO: Rename file.
export default class TradingHelper {

    static async onReaction(reaction, user) {
        // Prevent Cooper from collecting his own eggs.
        if (USERS.isCooper(user.id)) return false;
        if (!USERS.isCooperMsg(reaction.message)) return false;

        // Check if it is a trade actionable message.
        const isTrade = REACTIONS.didUserReactWith(reaction.message, CHICKEN.getDiscordID(), RAW_EMOJIS.TRADE);
        if (!isTrade) return false;
        
        const isAcceptEmoji = reaction.emoji.name === RAW_EMOJIS.HANDSHAKE;
        console.log('Someone trying to accept a trade', isAcceptEmoji);
    }

    // TODO: Refactor, this kind of thing should be isolated to a file, it is an action and not core to the service - but an implementation
    // of the service.

    static async onInteractionCreate(interaction, client) {
        console.log('trade_interaction', interaction);

        // TODO: Filter out trades by user (won't want to accept their own trades);

        let trades = await Trading.all();

        // Filter own trades from trades to accept.
        if (interaction.customId === 'accept_trade')
            trades = trades.filter(t => t.trader_id !== interaction.user.id)

        if (interaction.customId === 'cancel_trade')
            trades = trades.filter(t => t.trader_id === interaction.user.id)

        const tradeOptions = trades.map(t => ({
            label: `${t.id} - ${t.offer_item}x${t.offer_qty}`,
            description: `${t.trader_username}'s ${t.offer_item}x${t.offer_qty} for your ${t.receive_item}x${t.receive_qty}`,
            value: String(t.id)
        }));

        if (interaction.customId === 'accept_trade') {
            console.log('Button accept trade');
            await interaction.reply({ 
                ephemeral: true, 
                content: '**__Warning__ Trade Action**: Pick a trade to accept:', 
                components: [new ActionRowBuilder().addComponents(new SelectMenuBuilder()
                    .setCustomId('accept_trade_select')
                    .setPlaceholder('Select a trade #ID to accept:')
                    .setMaxValues(1)
                    .addOptions(...tradeOptions))] 
            });
        }

        if (interaction.customId === 'cancel_trade') {
            console.log('Button cancel trade');
            await interaction.reply({ 
                ephemeral: true, 
                content: '**__Warning__ Trade Action**: Pick a trade to accept:', 
                components: [new ActionRowBuilder().addComponents(new SelectMenuBuilder()
                    .setCustomId('cancel_trade_select')
                    .setPlaceholder('Select a trade #ID to cancel:')
                    .setMaxValues(1)
                    .addOptions(...tradeOptions))] 
            });
        }

        // Need to check context of whether it as accepting or cancelling

        if (interaction.customId === 'accept_trade_select') {
            await interaction.reply({
                ephemeral: true,
                content: 'Work in progress, accepting.',
            });

            // await interaction.reply({
            //     ephemeral: true,
            //     content: 'Confirm accepting trade',
            //     components: [
            //         new ActionRowBuilder().addComponents([
            //             new ButtonBuilder()
            //                 .setCustomId('confirm_trade')
            //                 .setLabel('Confirm')
            //                 .setStyle(ButtonStyle.Success),
            //         ])
            //     ]
            // });
        }

        if (interaction.customId === 'cancel_trade_select') {
            await interaction.reply({
                ephemeral: true,
                content: 'Work in progress, cancelling.',
            });

            // await interaction.reply({
            //     ephemeral: true,
            //     content: 'Confirm accepting trade',
            //     components: [
            //         new ActionRowBuilder().addComponents([
            //             new ButtonBuilder()
            //                 .setCustomId('confirm_trade')
            //                 .setLabel('Confirm')
            //                 .setStyle(ButtonStyle.Success),
            //         ])
            //     ]
            // });
        }

        if (interaction.customId === 'create_trade') {
            interaction.reply({ content: 'Create trade WIP', ephemeral: true });
            console.log('Create trade');

            // Modal?
            const modal = new ModalBuilder()
                .setCustomId('myModal')
                .setTitle('My Modal');

            // Add components to modal

            // Create the text input components
            const favoriteColorInput = new TextInputBuilder()
                .setCustomId('favoriteColorInput')
                // The label is the prompt the user sees for this input
                .setLabel("What's your favorite color?")
                // Short means only a single line of text
                .setStyle(TextInputStyle.Short);

            const hobbiesInput = new TextInputBuilder()
                .setCustomId('hobbiesInput')
                .setLabel("What's some of your favorite hobbies?")
                // Paragraph means multiple lines of text.
                .setStyle(TextInputStyle.Paragraph);

            // An action row only holds one text input,
            // so you need one action row per text input.
            const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
            const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);

            // Add inputs to the modal
            modal.addComponents(firstActionRow, secondActionRow);

            // Show the modal to the user
            interaction.showModal(modal);
        }
    }

    // TODO: Rename
    static async announce() {
        // Post latest/most recent 5-10 trades in talk.
        const lastTrades = await Trading.all();
        if (lastTrades.length === 0) return null;

        const msgTitle = '**Latest active trades**';
        const msgContent = msgTitle + ':\n' + this.manyTradeItemsStr(lastTrades);
        const talkChannel = CHANNELS._getCode('TALK');
        const updateMsg = await MESSAGES.getSimilarExistingMsg(talkChannel, msgTitle);
        if (!updateMsg) {
            const msg = await CHANNELS._send('TALK', msgContent, 0, 30000);
            msg.edit({ components: [
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setLabel("Accept")
                        .setCustomId('accept_trade')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setLabel("Cancel")
                        .setCustomId('cancel_trade')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel("Create")
                        // .setCustomId('create_trade')
                        // .setStyle(ButtonStyle.Primary)
                        .setURL("https://www.thecoop.group/conquest/economy/trade")
                        .setStyle(ButtonStyle.Link)

                ])
            ] });
        } else 
            updateMsg.edit(msgContent);
    }

    static async findOfferMatches(offerItem) {
        const query = {
            name: "get-trades-by-offer",
            text: `SELECT * FROM open_trades WHERE offer_item = $1`,
            values: [offerItem]
        };

        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async findEitherMatching(receiveItem) {
        const query = {
            name: "get-trades-by-offer",
            text: `SELECT * FROM open_trades WHERE receive_item = $1 OR offer_item = $1`,
            values: [receiveItem]
        };

        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async findOfferReceiveMatches(offerItem, receiveItem) {
        const query = {
            name: "get-trades-by-offer-receive",
            text: `SELECT * FROM open_trades WHERE offer_item = $1 AND receive_item = $2`,
            values: [offerItem, receiveItem]
        };

        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async matches(offerItem, receiveItem, offerQty, receiveQty) {
        const query = {
            name: "get-trades-by-offer-receive-qty",
            text: `SELECT * FROM open_trades 
                WHERE offer_item = $1 AND receive_item = $2 AND offer_qty = $3 AND receive_qty <= $4`,
            values: [offerItem, receiveItem, offerQty, receiveQty]
        };

        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async listMatch(offerItem, receiveItem) {
        const query = {
            name: "get-matches-of-type",
            text: `SELECT * FROM open_trades WHERE offer_item = $1 and receive_item = $2`,
            values: [offerItem, receiveItem]
        };
        
        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    // Turn trade into items receive/loss string from searcher perspective 
    // (not trader perspective).
    static tradeItemsStr(trade) {
        return ITEMS.exchangeItemsQtysStr(
            trade.receive_item, trade.receive_qty,
            trade.offer_item, trade.offer_qty
        );
    }

    static manyTradeItemsStr(trades) {
        return trades.map(trade =>
            `**#${trade.id}** by ${trade.trader_username} | ${this.tradeItemsStr(trade)} |`
        ).join('\n');
    }

    // This method directly takes items from user to close a trade.
    static async accept(openTradeID, accepteeID, accepteeName) {
        try {
            // Get trade by ID.
            const trade = await Trading.get(openTradeID);

            // Trade may have been removed before accept.
            if (await Trading.resolve(trade, accepteeID)) {
                // Build string for logging/feedback.
                const exchangeStr = this.tradeItemsStr(trade);
                const actionStr = `**${accepteeName} accepted trade #${trade.id} from ${trade.trader_username}`;
                const tradeConfirmStr = `${actionStr}**\n\n${exchangeStr}`;

                // Log confirmed trades
                CHANNELS._postToChannelCode('TRADE', tradeConfirmStr, 999);

                // Return successful result.
                return true;
            }
        } catch(e) {
            console.log('Error accepting trade offer.');
            console.error(e);
        }        
        return false;
    }

    static async cancel(cancelTradeID, canceleeName) {
        try {
            // Get trade by ID
            const trade = await Trading.get(cancelTradeID);
            await Trading.close(trade);

            // Build string for logging/feedback.
            const lossItemQtyStr = ITEMS.lossItemQtyStr(trade.offer_item, trade.offer_qty);
            const tradeCancelStr = `**${canceleeName} cancelled trade #${trade.id}**\n\n${lossItemQtyStr}`;

            // Log confirmed trades
            CHANNELS._postToChannelCode('TRADE', tradeCancelStr, 999);

            // Return successful result.
            return true;

        } catch(e) {
            console.log('Error accepting trade offer.');
            console.error(e);
            return false;
        }        
    }

    // Calculate conversion rate between items based on current open trade rates.
    static async conversionRate(offerItem, receiveItem) {
        const matches = await this.findOfferReceiveMatches(offerItem, receiveItem);
        const ratios = matches.map(match => match.receive_qty / match.offer_qty);
        const sumAverage = ratios.reduce((acc, val) => {
          acc += val;
          return acc;
        }, 0);
        const average = sumAverage / ratios.length;

        return average;
    }

}