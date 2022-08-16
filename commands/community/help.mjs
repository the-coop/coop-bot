import { SlashCommandBuilder } from "@discordjs/builders";

export const name = 'help';

export const description = 'Receive helpful/additional information related to your query.';
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
	.addStringOption(option => 
		option
			.setName('query')
			.setDescription('Search query/short problem text?')
	)

// TODO: ... Knowledgebase/wiki required/beneficial here?
export const execute = async (interaction) => {
	// let suggestionText = interaction.options.get('query').value ?? '';

	// Form the success message.
	const successText = `I'm sorry, I can't help you yet. Ask Commander/a Leader.`;
	return await interaction.reply(successText);
};
