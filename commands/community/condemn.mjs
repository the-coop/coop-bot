import { SlashCommandBuilder } from "@discordjs/builders";
import { CHANNELS } from "../../coop.mjs";

export const name = 'condemn';

export const description = 'Condemn a user for a recent action';
    
export const examples = '/condemn <message>';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)

	.addUserOption(option => 
		option
			.setName('user')
			.setDescription('Who would you like to condemn?')
			.setRequired(true)
	)

	// Add some way to warn/hint about limits...?
	// Message has to be at least 30 characters and no more than 400.
	.addStringOption(option => 
		option
			.setName('reason')
			.setDescription('Reason for condemnation')
			.setRequired(true)
	);


export const execute = async (interaction) => {
	// Access the campaign text.
	const reason = interaction.options.get('reason').value ?? '';
	const user = interaction.options.get('user')?.user;

	// Start the poll, should save message ID for later results consideration.
	const text = `Should ${user.username} be condemned${reason ? ` for "${reason.toLowerCase()}"` : ''}?`
		.replace('.', '');
		
	await CHANNELS._getCode('TALK').send({
		poll: {
			question: { text },
			answers: [
				{ text: `Lenience/Warning only`, emoji: '🕊️' },
				{ text: `Escalate punishment`, emoji: '🗡️' }
			],
			duration: 1,
			allow_multiselect: false
		}
	});

	return await interaction.reply({ content: `Started condemnation of ${user.username}!`, ephemeral: true });
};

