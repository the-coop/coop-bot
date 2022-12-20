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
	return await interaction.reply('https://www.thecoop.group/guide');
};
