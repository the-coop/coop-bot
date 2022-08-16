import { SlashCommandBuilder } from "@discordjs/builders";

import COOP, { USERS, CHANNELS } from '../../organisation/coop.mjs';
import { EMOJIS } from '../../organisation/config.mjs';
import SuggestionsHelper from '../../operations/activity/suggestions/suggestionsHelper.mjs';

export const name = 'suggest';

// description: 'Allows you to suggest Coop related changes to the #suggest channel.',
export const description = 'Suggest a change or addition to the community/server/services';

// examples: ['!suggest <suggestion>', '!suggest update The Coop blog biweekly'],
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
	.addStringOption(option => 
		option
			.setName('text')
			.setDescription('Suggestion text/message?')
			.setRequired(true)
	)

export const execute = async (interaction) => {
	let suggestionText = interaction.options.get('text').value ?? '';

	// Prevent things which may appear economical/interactable/item duplicatory.
	// Cooper will not allow pickup of any item without authoratitive drop meoji reaction.
	// Items may be interactable with unless the text is tested.
	// A class should be built for tihs purpose.

	if (suggestionText.includes('@everyone') || suggestionText.includes('@here'))
		return COOP.MESSAGES.selfDestruct(interaction.channel, 'Pinging via Cooper disallowed.');

	try {
		// Post in suggestions.
		const cleanedContent = suggestionText.replace('!suggestion', '').replace('!suggest', '');
		const pollAcknowledgement = await COOP.CHANNELS._postToChannelCode('SUGGESTIONS', cleanedContent);

		// Detect attempts to suggest PROJECT_CHANNEL
		// if (suggestionText.toLowerCase().includes('project channel')) {
			// If needs an owner to give the project channel to.
		// }

		// Add reactions for people to use.
		SuggestionsHelper.activateSuggestion(pollAcknowledgement);

		// Add intended for roadmap, add roadmap reaction for adding to roadmap.
		if (suggestionText.toLowerCase().indexOf('roadmap') > -1)
			COOP.MESSAGES.delayReact(pollAcknowledgement, EMOJIS.ROADMAP, 999);

		// Send poll tracking link.
		USERS._dm(interaction.user.id, 
			'I started your poll, track its progress with this link: ' + 
			COOP.MESSAGES.link(pollAcknowledgement) + 
			+ " \n\n\n " + " _ " + suggestionText
		);

		// Send confirmation of success.
		return await interaction.reply({ 
			content: `Added to ${CHANNELS.textRef('SUGGESTIONS')} & DM'd to you.`, 
			ephemeral: true
		});

	} catch(err) {
		console.error(err);
		return false;
	}
};
