import { SlashCommandBuilder } from "@discordjs/builders";
import COOP, { ROLES, USERS } from '../../organisation/coop.mjs';
import { CHANNELS } from '../../organisation/config.mjs';

import ElectionHelper from '../../operations/members/hierarchy/election/electionHelper.mjs';

export const name = 'nominate';

export const description = 'Nominate a potential leader/commander.';
    
export const examples = '/nominate <@user> <message>';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)

	.addUserOption(option => 
		option
			.setName('nomination_user')
			.setDescription('Who would you like to nominate?')
			.setRequired(true)
	)
	.addStringOption(option => 
		option
			.setName('campaign_text')
			.setDescription('Please provide your nomination message')
			.setRequired(true)
	);


export const execute = async (interaction) => {
	// Access the campaign text.
	const campaignText = interaction.options.get('campaign_text').value ?? '';
	const nominee = interaction.options.get('nomination_user')?.user;

	// Prevent @everyone from idiots using it.
	if (campaignText.includes('@everyone')) {
		return await interaction.reply({ 
			content: 'Warning: @ everyone not allowed.', 
			ephemeral: true 
		});
	}
	// else if (campaignText.includes('@')) {
	// 	return await interaction.reply({ 
	// 		content: "Warning: @ is not allowed. Stand on your own or don't stand at all", 
	// 		ephemeral: true 
	// 	});
	// }

	// Prevent prospects from getting elected.
	if (ROLES._idHasCode(nominee.id, 'PROSPECT'))
		return await interaction.reply({ 
			content: 'Prospects cannot be nominated.', 
			ephemeral: true 
		});

	// Prevent unrecognised users from standing.
	if (!USERS.loadSingle(nominee.id))
		return await interaction.reply({ 
			content: 'Unrecognised users cannot stand for election.', 
			ephemeral: true 
		});

	try {
		// Prevent bad campaign texts.
		if (campaignText.length < 30) {
			// Send them a copy before deleting.
			USERS._dm(interaction.user.id, `${interaction.user.username} rewrite campaign message, not long enough.\n\n` + campaignText);
			return await interaction.reply({ 
				content: `${interaction.user.username} rewrite campaign message, insufficient.`, 
				ephemeral: true 
			});
		}

		// Limit campaign text length.
		if (campaignText.length > 400) {
			// Send them a copy before deleting.
			USERS._dm(nominee.id, `${nominee.username} rewrite campaign message, too long.\n\n` + campaignText);
			return await interaction.reply({ 
				content: `${nominee.username} rewrite campaign message, too long.`, 
				ephemeral: true 
			});
		}

		// Check if election is ongoing.
		const isElec = await ElectionHelper.isElectionOn();

		if (!isElec) {
			const nextElecFmt = await ElectionHelper.nextElecFmt();
			const noElecText = `There is no election currently ongoing. Next is ${nextElecFmt}!`;
			return await interaction.reply({ content: noElecText, ephemeral: true });
		}
		
		if (isElec) {
			// Check if user is not already a candidate.
			const prevCandidate = await ElectionHelper.getCandidate(nominee.id);
			if (!prevCandidate) {
				COOP.MESSAGES.selfDestruct(interaction.channel, `${interaction.user.username}, you wanna nominate ${nominee.username} for <#${CHANNELS.ELECTION.id}>, eyyy?`);

				const emojiText = COOP.MESSAGES.emojiCodeText('ELECTION_CROWN');
				const electionEmbed = COOP.MESSAGES.embed({ 
					title: `Election Event: ${interaction.user.username} nominates ${nominee.username} for election!`,
					description: `${campaignText}\n\n` +
						`To vote for <@${nominee.id}> press (react) the crown emoji ${emojiText}.`,
					thumbnail: COOP.USERS.avatar(nominee)
				});

				const electionMsg = await COOP.CHANNELS._postToChannelCode('ELECTION', electionEmbed);

				const msgLink = COOP.MESSAGES.link(electionMsg);

				// Add candidate to election
				await ElectionHelper.addCandidate(nominee.id, msgLink);

				const successfulCandidateText = `${interaction.user.username} nominates ${nominee.username} for the <#${CHANNELS.ELECTION.id}>`;

				// Post to feed
				COOP.CHANNELS._postToFeed(successfulCandidateText);
				
				// Add coop emoji to campaign message and crown
				COOP.MESSAGES.delayReact(electionMsg, '👑', 666);

				// Indicate success.
				return await interaction.reply({ content: successfulCandidateText, ephemeral: true });
			}
		}

		return await interaction.reply('Something may have gone wrong with nomination.');

	} catch(e) {
		console.error(e);
		console.log('!stand failed.');
	}
};

