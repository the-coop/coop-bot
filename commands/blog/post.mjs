import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton } from "discord.js";
import BlogHelper from "../../operations/marketing/blog/blogHelper.mjs";

import { EMOJIS, RAW_EMOJIS } from '../../organisation/config.mjs';
import { MESSAGES, TIME, ITEMS, CHANNELS, USABLE } from '../../organisation/coop.mjs';
import Database from "../../organisation/setup/database.mjs";

export const name = 'post';

export const description = 'Post, preview or publish posts';
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)

	.addSubcommand(subcommand =>
		subcommand
			.setName('create')
			.setDescription('Democratically creates a community blog post.')
			.addStringOption(option => 
				option
					.setName('title')
					.setDescription('Post title?')
					.setRequired(true))
			.addStringOption(option => 
				option
					.setName('deadline')
					.setDescription('How long will the post take to write?')
					.setRequired(true))
	)
	
	// Preview subcommand
	.addSubcommand(subcommand =>
		subcommand
			.setName('preview')
			.setDescription('Preview publishing of channel.'))

	// Publish sub-command!
	.addSubcommand(subcommand =>
		subcommand
			.setName('publish')
			.setDescription('Publish this channel.'));

export const execute = async interaction => {
	const action = interaction.options.getSubcommand();
	if (action === 'create') return await post(interaction);
	if (action === 'preview') return await preview(interaction);
	// if (action === 'publish') return await publish(interaction);
}

const post = async interaction => {
	// Access the project title text.
	const title = interaction.options.get('title').value ?? '';
	const deadline = interaction.options.get('deadline').value ?? '';

	// Check deadline is valid.
	if (!TIME.isValidDeadline(deadline))
		return await interaction.reply(`<@${interaction.user.id}>, ${deadline} is an invalid duration for a post deadline.`);

	// Calculate the price.
	const basePrice = await ITEMS.perBeakRelativePrice('GOLD_COIN', 0.05);
	const numWeeks = Math.max(1, TIME.weeksUntilStr(deadline));
	const price = basePrice * numWeeks;

	// Check the user can afford to pay the price!
	const userCoinQty = await ITEMS.getUserItemQty(interaction.user.id, 'GOLD_COIN');
	if (userCoinQty < price)
		return await interaction.reply(`<@${interaction.user.id}>, you cannot afford the post price (${price}xGOLD_COIN).`);

	// Form the confirmation message text.
	const emoji = MESSAGES.emojiCodeText('GOLD_COIN');
	const createProjectText = '**Confirm post creation:**\n\n' +

		'Title: __' + title + '__\n' +
		'Writer: ' + `<@${interaction.user.id}>` + '\n' +
		'Deadline: ' + deadline + '\n' +
		'Price: ' + emoji + ' ' + price + ' _(0.01% avg coin qty a week)_\n\n';

	// Create the response actions.
	await interaction.reply({ content: createProjectText, components: [
		new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('confirm')
					.setLabel('Confirm')
					.setStyle('SUCCESS'),
				new MessageButton()
					.setCustomId('cancel')
					.setLabel('Cancel')
					.setStyle('DANGER')
			)
	] });

	// Handle confirmation/cancellation of post creation.
	const filter = i => (
		['confirm', 'cancel'].includes(i.customId) 
		&& 
		i.user.id === interaction.user.id
	);
	const collector = interaction.channel.createMessageComponentCollector({ max: 1, filter, time: 6666 });
	collector.on('collect', async i => {
		// Give us more time to complete actions.
		await i.deferUpdate();

		// Handle cancellations.
		if (i.customId === 'cancel')
			return await i.editReply({ content: 'Cancelled post creation.', components: [] });

		// Handle confirmations.
		if (i.customId === 'confirm') {
			// Check the user did pay.
			const didPay = await USABLE.use(interaction.user.id, 'GOLD_COIN', price, 'Proposing blog post');
			if (!didPay) 
				return await i.editReply({ content: `Post proposal cancelled, payment failure.`, components: [] });
 
			// Create the project in suggestions for democratic approval.
			const postSuggestMsg = await CHANNELS._postToChannelCode('SUGGESTIONS', createProjectText);

			// Add reactions for people to use.
			MESSAGES.delayReact(postSuggestMsg, EMOJIS.POLL_FOR, 333);
			MESSAGES.delayReact(postSuggestMsg, EMOJIS.POLL_AGAINST, 666);

			// Add project marker.
			MESSAGES.delayReact(postSuggestMsg, RAW_EMOJIS.POST, 999);
			
			// Send poll tracking link.
			try {
				USERS._dm(interaction.user.id, 
					title + '\'s project channel is being voted on:\n' + 
					MESSAGES.link(postSuggestMsg)
				);
			} catch(e) {
				console.log('Sending confirmation of project suggestion failed.');
				console.error(e);
			}

			return await i.editReply({ content: 'Proposed post pending creation!', components: [] });
		}
	});
}


const preview = async interaction => {
	const draft = await BlogHelper.loadDraftByChannelID(interaction.channel.id);
	const previewLink = `https://thecoop.group/blog/preview?channel_id=${interaction.channel.id}`;

	// Only allow usage on a draft channel.
	if (!draft)
		return await interaction.reply(`'Try preview on a post draft channel!'`);

	// Add content to the table so it shows up to date.
	const chan = CHANNELS._get(draft.channel_id);
	const content = await BlogHelper.buildDraft(chan);

	await Database.query({
		name: "update-draft-content",
		text: `UPDATE post_drafts SET content = $1 WHERE channel_id = $2`,
		values: [content, draft.channel_id]
	});

	// Send the link
	return await interaction.reply(`**${draft.title}** preview: \n<${previewLink}>`);
}


// const preview = interaction => {
// 	const draft = await BlogHelper.loadDraftByChannelID(interaction.channel.id);
// 	const previewLink = `https://thecoop.group/blog/preview?channel_id=${interaction.channel.id}`;

// 	if (!draft)
// 		MESSAGES.selfDestruct(interaction.channel, 'Try preview on a post draft channel!');

// 	// Add content to the table so it shows up to date.
// 	const chan = CHANNELS._get(draft.channel_id);
// 	const content = await BlogHelper.buildDraft(chan);

// 	await Database.query({
// 		name: "update-draft-content",
// 		text: `UPDATE post_drafts SET content = $1 WHERE channel_id = $2`,
// 		values: [content, draft.channel_id]
// 	});

// 	// Send the link
// 	MESSAGES.selfDestruct(interaction.channel, `**${draft.title}** preview: \n<${previewLink}>`);

// 	return interaction.reply('Preview is work in progres.');
// }

// const publish = interaction => {		
// 	try {
// 		// If ID is null... try to see if the current one will work.
// 		const draft = await BlogHelper.loadDraftByChannelID(interaction.channel.id);
// 		if (!draft)
// 			return MESSAGES.selfDestruct(interaction.channel, 'Please run command within a post channel.');

// 		// Check user is the owner of the blog post draft.
// 		if (interaction.user.id !== draft.owner_id)
// 			return MESSAGES.selfDestruct(interaction.channel, 'You cannot manage that blog post draft.');

// 		const confirmMsg = await authorConfirmationPrompt(interaction.channel, 'Really publish ' + draft.title + '?', interaction.user.id);
// 		if (!confirmMsg) return null;

// 		// Fulfil the draft.
// 		BlogHelper.fulfilDraft(draft);
		
// 	} catch(e) {
// 		console.log('Failed to publish blog post draft.');
// 		console.error
// 	}
// }