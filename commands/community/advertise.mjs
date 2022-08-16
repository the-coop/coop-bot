import axios from 'axios';
import { SlashCommandBuilder } from "@discordjs/builders";

import { EMOJIS } from '../../organisation/config.mjs';
import { ITEMS, CHANNELS, USABLE, MESSAGES } from "../../organisation/coop.mjs";

import InteractionHelper from '../../operations/activity/messages/interactionHelper.mjs';
import SuggestionsHelper from '../../operations/activity/suggestions/suggestionsHelper.mjs';

export const name = 'advertise';

export const description = 'Post an advert to the community';
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
	.addStringOption(option => 
		option
			.setName('advert_target_url')
			.setDescription('Link the ad points at')
			.setRequired(true)
	)
	.addStringOption(option => 
		option
			.setName('advert_image_url')
			.setDescription('Image URL for ad')
			.setRequired(true)
	);

export const execute = async interaction => {
	try {
		const advertTargetURL = interaction.options.get('advert_target_url').value;
		const advertImageURL = interaction.options.get('advert_image_url').value;
	
		// Check the advert target link is statusful.
		const advertTargetResponse = await axios.get(advertTargetURL);
		if (advertTargetResponse.status !== 200)
			return await interaction.reply({ content: 'Advert target URL is invalid, please try again.', ephemeral: true });
				
		// Check the image URL is an image and valid (200 status code).
		const advertImageResponse = await axios.get(advertImageURL);
		const isImageURL = advertImageResponse.headers['content-type'].match(/(image)+\//g).length !== 0 || false;
		if (advertImageResponse.status !== 200 || !isImageURL)
			return await interaction.reply({ content: 'Advert image URL is invalid, please try again.', ephemeral: true });

		// Calculate price and check they can afford.
		// const price = await ITEMS.perBeakRelativePrice('GOLD_COIN', 5);
		const price = await ITEMS.perBeakRelativePrice('GOLD_COIN', .005);

		// Check user can afford this price.
		const userCoinQty = await ITEMS.getUserItemQty(interaction.user.id, 'GOLD_COIN');
		if (userCoinQty < price)
			return await interaction.reply({ content: `Can't afford ad ${userCoinQty.toFixed(2)}/${price.toFixed(2)} GOLD_COIN.`, ephemeral: true });

		// Craft the confirmation message texts.
		const feedbackTexts = {
			preconfirmationText: `Testing the advert command. Price: GOLD_COIN (${price.toFixed()})`,
			confirmationText: 'Your advert is being approved by the community, <suggest>',
			cancellationText: 'Cancelled advert creation, you were not charged.'
		};

		// Handle confirmation/rejection
		const userIntent = await InteractionHelper.confirm(interaction, feedbackTexts);
		if (!userIntent) return await interaction.editReply( `Ad creation cancelled.`);

		// Charge the user for the advert.
		const didPay = await USABLE.use(interaction.user.id, 'GOLD_COIN', price, 'Proposing project');
		if (!didPay) return await interaction.reply({ content: `Ad payment failed.`, ephemeral: true });
	
		// Post to suggestions for confirmation.
		const createAdText = '**New Advert Pending Approval:**\n\n' +

			'Creator: ' + `<@${interaction.user.id}>` + '\n' +

			'Target: ' + `${advertTargetURL}>` + '\n' +

			'Price: ' + price.toFixed(2) + ' _(0.5% avg coin qty a week)_\n\n' +

			'_Please vote on the advert\'s approval!_\n' +
			
			advertImageURL;

		const suggestionMsg = await CHANNELS._postToChannelCode('SUGGESTIONS', createAdText);
	
		// Add reactions for people to use.
		SuggestionsHelper.activateSuggestion(suggestionMsg);

		// Add project marker.
		MESSAGES.delayReact(suggestionMsg, EMOJIS.ADVERT, 999);

		// Form the success message.
		const successText = `Ad cost paid and being approved.`;
		return await interaction.editReply(successText);
		
	} catch(e) {
		console.error(e);
		return await interaction.editReply('The advertise command failed, please try again or contact a leader/commander.');
	}
};
