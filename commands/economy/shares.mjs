import { SlashCommandBuilder } from "@discordjs/builders";

import DatabaseHelper from "../../operations/databaseHelper.mjs";
import { usableItemCodeGuard } from "../../operations/minigames/medium/economy/itemCmdGuards.mjs";

import { ITEMS, MESSAGES, USERS } from "../../organisation/coop.mjs";

// TODO: Refactor to a different location.
const perc = (sub, total) => Math.round((sub / total) * 100);

export const name = 'shares';

export const description = 'Check item shares';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
	.addStringOption(option => 
		option
			.setName('item_code')
			.setDescription('Item code? (default ALL)')
			.setRequired(false)
	);


export const execute = async (interaction) => {
	const itemCodeInput = interaction.options.get('item_code');
	let itemCode = itemCodeInput ? itemCodeInput.value : '*';

	const validItemCode = ITEMS.interpretItemCodeArg(itemCode);
	if (itemCode !== '*' && !usableItemCodeGuard(interaction.channel, validItemCode, interaction.user))
		return null;

	if (itemCode === '*') {
		let overallOwnershipData = await DatabaseHelper.manyQuery({
			name: 'all-item-shares',
			text: `SELECT DISTINCT ON (i.item_code) i.item_code, i.owner_id, i.quantity, total_qty, ROUND((i.quantity / total_qty) * 100) as share
			FROM items i
				INNER JOIN ( 
					SELECT item_code, MAX(quantity) AS highest, SUM(quantity) as total_qty
					FROM items
					GROUP BY item_code
				) AS grouped_items
				ON  grouped_items.item_code = i.item_code
				AND grouped_items.highest = i.quantity`
		});

		overallOwnershipData.sort((a, b) => (a.share < b.share) ? 1 : -1);

		// Crop the list to the first ten.
		overallOwnershipData = overallOwnershipData.slice(0, 15);

		let sharesText = `**Item ownership shares/market %:**\n\n` +
			overallOwnershipData.map(val => {
				const username = USERS._get(val.owner_id).user.username;
				const emoji = MESSAGES.emojiCodeText(val.item_code);
				const itemQty = `${ITEMS.displayQty(val.quantity)}x${emoji}`;
				return `${username}'s ${itemQty} (${val.share}%)`;
			}).join(', ') + '.';

		sharesText += '\n\n\n' + 
			`See more details via website: <https://www.thecoop.group/conquest/economy/items/${itemCode}>`;

		// Output share of requested item (if valid)
		MESSAGES.silentSelfDestruct(interaction.channel, sharesText);
		return await interaction.reply({ content: `Command executed.`, ephemeral: true });
	}
	
	// After ALL accounted, support codes, emojis, names.
	itemCode = ITEMS.interpretItemCodeArg(itemCode);

	// Select all owners and their quantities of this item.
	const itemOwnershipArr = await DatabaseHelper.manyQuery({
		name: 'get-item-shares',
		text: `SELECT quantity, owner_id FROM items WHERE item_code = $1`,
		values: [itemCode]
	});

	// Calculate the total quantity of this item from the records.
	const itemTotal = itemOwnershipArr.reduce((acc, val) => acc += val.quantity, 0);

	// Filter any meaningless entries out.
	const meaningfulOwnersArr = itemOwnershipArr.filter(val => perc(val.quantity, itemTotal) > 0);
	
	// Sort it by biggest first.
	meaningfulOwnersArr.sort((a, b) => (a.quantity < b.quantity) ? 1 : -1);
	
	// Format and output the resulting message/info.
	const emoji = MESSAGES.emojiCodeText(itemCode);
	const ownershipText = `**${itemCode} ${emoji} ownership shares/market %:**\n\n` +
		meaningfulOwnersArr.map((val, index) => 
			`#${index + 1}. ` + 
			`${ITEMS.displayQty(val.quantity)} ` +
			`(${perc(val.quantity, itemTotal)}%) <@${val.owner_id}>`
		).join('\n') + '\n' +
		`[See advanced details via website](<https://www.thecoop.group/conquest/economy/items>)`

	// Output share of requested item (if valid)
	MESSAGES.silentSelfDestruct(interaction.channel, ownershipText);

	return await interaction.reply({ content: `Command executed.`, ephemeral: true });
};