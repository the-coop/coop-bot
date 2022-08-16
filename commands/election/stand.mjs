import { SlashCommandBuilder } from "@discordjs/builders";
import COOP, { ROLES, USERS } from '../../organisation/coop.mjs';
import { CHANNELS } from '../../organisation/config.mjs';

import ElectionHelper from '../../operations/members/hierarchy/election/electionHelper.mjs';

export const name = 'stand';

export const description = 'Offer yourself as a potential leader/commander.';
    
export const examples = '!stand <message>';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)

	// Add some way to warn/hint about limits...?
	// Message has to be at least 30 characters and no more than 400.
	.addStringOption(option => 
		option
			.setName('campaign_text')
			.setDescription('Please provide your electoral campaign message')
			.setRequired(true)
	);


export const execute = async (interaction) => {
	// Access the campaign text.
	const campaignText = interaction.options.get('campaign_text').value ?? '';

	// Prevent @everyone from idiots using it.
	if (campaignText.includes('@everyone')) {
		return COOP.MESSAGES.selfDestruct(interaction.channel, 'Warning: @ everyone not allowed.', 0, 5000);
	}
	else if (campaignText.includes('@')) {
		return COOP.MESSAGES.selfDestruct(interaction.channel, "Warning: @ is not allowed. Stand on your own or don't stand at all", 0, 5000);
	}

	// Prevent prospects from getting elected.
	if (ROLES._idHasCode(interaction.user.id, 'PROSPECT'))
		return COOP.MESSAGES.selfDestruct(interaction.channel, 'Prospects cannot stand for election.', 0, 5000);

	// Prevent unrecognised users from standing.
	if (!USERS.loadSingle(interaction.user.id))
		return COOP.MESSAGES.selfDestruct(interaction.channel, 'Unrecognised users cannot stand for election.', 0, 5000);

	try {
		// Prevent bad campaign texts.
		if (campaignText.length < 30) {
			// Send them a copy before deleting.
			USERS._dm(interaction.user.id, `${interaction.user.username} rewrite campaign message, not long enough.\n\n` + campaignText);
			return COOP.MESSAGES.selfDestruct(
				interaction.channel, 
				`${interaction.user.username} rewrite campaign message, insufficient.`,
				0,
				7500
			);
		}

		// Limit campaign text length.
		if (campaignText.length > 400) {
			// Send them a copy before deleting.
			USERS._dm(interaction.user.id, `${interaction.user.username} rewrite campaign message, too long.\n\n` + campaignText);
			return COOP.MESSAGES.selfDestruct(
				interaction.channel, 
				`${interaction.user.username} rewrite campaign message, too long.`,
				0,
				7500
			);
		}

		// Check if election is ongoing.
		const isElec = await ElectionHelper.isElectionOn();

		if (!isElec) {
			const nextElecFmt = await ElectionHelper.nextElecFmt();
			const noElecText = `There is no election currently ongoing. Next is ${nextElecFmt}!`;
			return COOP.MESSAGES.selfDestruct(interaction.channel, noElecText, 0, 7500);
		}
		
		if (isElec) {
			// Check if user is not already a candidate.
			const prevCandidate = await ElectionHelper.getCandidate(interaction.user.id);
			if (!prevCandidate) {
				COOP.MESSAGES.selfDestruct(interaction.channel, `${interaction.user.username}, you wanna stand for <#${CHANNELS.ELECTION.id}>, eyyy?`);

				const emojiText = COOP.MESSAGES.emojiCodeText('ELECTION_CROWN');
				const electionEmbed = COOP.MESSAGES.embed({ 
					title: `Election Event: ${interaction.user.username} stands for election!`,
					description: `${campaignText}\n\n` +
						`To vote for <@${interaction.user.id}> press (react) the crown emoji ${emojiText}.`,
					thumbnail: COOP.USERS.avatar(interaction.user)
				});

				const electionMsg = await COOP.CHANNELS._postToChannelCode('ELECTION', electionEmbed);

				const msgLink = COOP.MESSAGES.link(electionMsg);

				// Add candidate to election
				await ElectionHelper.addCandidate(interaction.user.id, msgLink);

				// Post to feed
				const successfulCandidateText = `${interaction.user.username} was put forward for <#${CHANNELS.ELECTION.id}>`;
				COOP.MESSAGES.selfDestruct(interaction.channel, successfulCandidateText);
				COOP.CHANNELS._postToFeed(successfulCandidateText);
				
				// Add coop emoji to campaign message and crown
				COOP.MESSAGES.delayReact(electionMsg, '👑', 666);
			}
		}

		// Indicate success.
		return await interaction.reply('Successfully entered the election!');

	} catch(e) {
		console.error(e);
		console.log('!stand failed.');
	}
};

