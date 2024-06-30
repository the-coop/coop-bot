import { SlashCommandBuilder } from "@discordjs/builders";

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

	console.log(interaction);
	return await interaction.reply({ content: 'Testing condemn command!', ephemeral: false });

	// TODO: Start the poll, should save message ID for later results consideration.
	await CHANNELS._getCode('TALK').send({
		poll: {
			question: { text: `Help evaluate ${user.username}'s rank:` },
			answers: [
				current !== 'MASTER' ? { text: `Promote up to ${promotion}`, emoji: '✅' } : null,
				current !== 'BEGINNER' ? { text: `Demote down to ${demotion}`, emoji: '❌' } : null,
				{ text: `Stay at current rank ${current}`, emoji: '⚖️' },
			].filter(i => i),
			duration: 12,
			allow_multiselect: false
		}
	});
};

