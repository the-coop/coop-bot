import { SlashCommandBuilder } from "@discordjs/builders";

import { RAW_EMOJIS, EMOJIS } from '../../organisation/config.mjs';
import { MESSAGES, ITEMS, TIME, USERS, CHANNELS } from '../../organisation/coop.mjs';

import UsableItemHelper from '../../operations/minigames/medium/economy/items/usableItemHelper.mjs';
// import ProjectsHelper from '../../operations/productivity/projects/projectsHelper.mjs';

import { authorConfirmationPrompt } from '../../operations/common/ui.mjs';
import SuggestionsHelper from "../../operations/activity/suggestions/suggestionsHelper.mjs";

export const name = 'project';

export const description = 'This command is used to suggest the creation of a community project with a deadline.';
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
	.addStringOption(option => 
		option
			.setName('title')
			.setDescription('Project title?')
			.setRequired(true)
	)
	.addStringOption(option => 
		option
			.setName('deadline')
			.setDescription('How long will the project take to complete?')
			.setRequired(true)
	);

export const execute = async (interaction) => {
	// Access the project title text.
	const title = interaction.options.get('title').value ?? '';
	const deadline = interaction.options.get('deadline').value ?? '';

	// TODO: Check title is valid.
	// TODO: Check the project does not already exist.

	// Check deadline is valid.
	if (!TIME.isValidDeadline(deadline))
		return MESSAGES.selfDestruct(interaction.channel, `<@${interaction.user.id}>, ${deadline} is an invalid duration for a project deadline.`);

	// Calculate the price.
	const basePrice = await ITEMS.perBeakRelativePrice('GOLD_COIN', 0.05);
	const numWeeks = Math.max(1, TIME.weeksUntilStr(deadline));
	const price = basePrice * numWeeks;

	// End the authority of the slash command handler, offload to messages.
	interaction.reply('Please confirm you want to go ahead.');

	// Acknowledge 
	const emoji = MESSAGES.emojiCodeText('GOLD_COIN');
	const createProjectText = '**Create !project?** Details:\n\n' +

		'Title: __' + title + '__\n' +
		'Owner: ' + `<@${interaction.user.id}>` + '\n' +
		'Deadline: ' + deadline + '\n' +
		'Price: ' + emoji + ' ' + price + ' _(0.01% avg coin qty a week)_\n\n'

	const confirmText = createProjectText + '_Please react with tick to propose the project\'s creation!_';

	// Check the user can afford to pay the price!
	const userCoinQty = await ITEMS.getUserItemQty(interaction.user.id, 'GOLD_COIN');
	if (userCoinQty < price)
		return MESSAGES.selfDestruct(interaction.channel, `<@${interaction.user.id}>, you cannot afford the project price (${price}xGOLD_COIN).`);

	// Use the confirmation from the coin flip feature! :D
	const confirmMsg = await authorConfirmationPrompt(interaction.channel, confirmText, interaction.user.id);
	if (!confirmMsg) return null;

	// Check the user did pay.
	const didPay = await UsableItemHelper.use(interaction.user.id, 'GOLD_COIN', price, 'Proposing project');
	if (!didPay) return MESSAGES.selfDestruct(interaction.channel, `Project proposal cancelled, payment failure.`);
	
	// Proceed to list the channel for approval.
	MESSAGES.selfDestruct(interaction.channel, title + '\'s project channel is being voted on!');

	// Create the project in suggestions for democratic approval.
	const projectSuggestionMsg = await CHANNELS._postToChannelCode('SUGGESTIONS', createProjectText);

	// Add reactions for people to use.
	SuggestionsHelper.activateSuggestion(projectSuggestionMsg);

	// Add project marker.
	MESSAGES.delayReact(projectSuggestionMsg, RAW_EMOJIS.PROJECT, 999);
	
	// Send poll tracking link.
	USERS._dm(interaction.user.id, 
		title + '\'s project channel is being voted on:\n' + 
		MESSAGES.link(projectSuggestionMsg)
	);
	
	// Indicate success.
	return true;
}