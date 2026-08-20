import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import COOP, { USABLE } from '../../coop.mjs';
import { EMOJIS } from 'coop-shared/config.mjs';
import Items from "coop-shared/services/items.mjs";
import Useable from "coop-shared/services/useable.mjs";

export const name = 'items';

// How long the pagination buttons stay usable after the last click.
const PAGINATION_IDLE_MS = 120000;

export const description = 'Check item ownership';
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
	.addUserOption(option => 
		option
			.setName('target')
			.setDescription('Whose items? (default yours)')
	)
	.addStringOption(option => 
		option
			.setName('item_code')
			.setDescription('Item code? (default ALL)')
	);


export const execute = async (interaction) => {
	const itemCodeInput = interaction.options.get('item_code');
	const targetInput = interaction.options.get('target');

	const itemCode = itemCodeInput ? itemCodeInput.value : 'ALL';
	const target = targetInput ? targetInput.user : interaction.user;

	// Try to interpret itemCode/itemEmoji arg
	const parsedItemCode = COOP.ITEMS.interpretItemCodeArg(itemCode);

	try {
		const name = target.username;

		// Retrieve all item counts that user owns.
		if (itemCode === 'ALL') {
			// Load all of the target's items.
			let items = await COOP.ITEMS.getUserItems(target.id);

			// Handle no item ownership situation.
			if (items.length === 0) 
				return await interaction.reply({ content: `${name} does not own any items.`, ephemeral: true });

			// Sort owned items by most first.
			items.sort((a, b) => (a.quantity < b.quantity) ? 1 : -1);

			// List every item, split into pages so no text overflow error happens.
			const pages = COOP.ITEMS.formItemDropTextPages(target, items);

			// Only one page's worth, no pagination controls needed.
			if (pages.length === 1)
				return await interaction.reply({ content: pages[0], ephemeral: true });

			const prevID = `items_prev_${interaction.id}`;
			const nextID = `items_next_${interaction.id}`;

			const pageText = index => `${pages[index]}\n\n_Page ${index + 1}/${pages.length}_`;
			const pageButtons = index => [new ActionRowBuilder().addComponents([
				new ButtonBuilder()
					.setEmoji('⬅️')
					.setLabel('Previous')
					.setCustomId(prevID)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(index === 0),
				new ButtonBuilder()
					.setEmoji('➡️')
					.setLabel('Next')
					.setCustomId(nextID)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(index === pages.length - 1)
			])];

			let page = 0;

			await interaction.reply({ content: pageText(page), components: pageButtons(page), ephemeral: true });

			// Let the owner of the interaction flick through their pages.
			const message = await interaction.fetchReply();
			const collector = message.createMessageComponentCollector({
				filter: i => i.user.id === interaction.user.id && [prevID, nextID].includes(i.customId),
				idle: PAGINATION_IDLE_MS
			});

			collector.on('collect', async i => {
				page = Math.min(Math.max(page + (i.customId === nextID ? 1 : -1), 0), pages.length - 1);
				await i.update({ content: pageText(page), components: pageButtons(page) });
			});

			// Remove the buttons once they stop being listened to.
			collector.on('end', async () => {
				try {
					await interaction.editReply({ content: pageText(page), components: [] });
				} catch (e) {
					// User already dismissed the ephemeral message, suppress.
				}
			});

			return true;
		}

		// Check if itemCode valid to use.
		if (!Useable.isUsable(parsedItemCode))
			return await interaction.reply({ content: `${name}, ${parsedItemCode} seems invalid.`, ephemeral: true });

		// Check a specific item instead.
		const itemQty = await Items.getUserItemQty(target.id, parsedItemCode);
		const displayQty = COOP.ITEMS.displayQty(itemQty);

		// Send specific item count.
		const emoji = COOP.MESSAGES.emojiText(EMOJIS[parsedItemCode]);
		if (itemQty > 0) {
			await interaction.reply({
				content: `${name} owns ${displayQty}x${parsedItemCode} ${emoji}.`,
				ephemeral: true
			});
			return true;
		}
		else 
			return await interaction.reply({
				content: `${name} does not own any ${parsedItemCode}.`, 
				ephemeral: true 
			});

	} catch(err) {
		console.error(err);

		// A follow up may have failed after the initial reply was already sent.
		const respond = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
		return await interaction[respond]({ content: `Error getting item ownership info.`, ephemeral: true });
	}

};