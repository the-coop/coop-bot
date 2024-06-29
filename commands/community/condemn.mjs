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
	return await interaction.reply({ content: 'Testing condemn command!', ephemeral: false });
};

