import { SlashCommandBuilder } from "discord.js";

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

export const execute = async (interaction) => {
	const query = (interaction.options.get('query')?.value ?? '').toLowerCase().trim();

	// Cooper is the guide now, so list what he can be asked to do.
	const commands = [...interaction.client.commands.values()]
		.filter(command => !query ||
			command.name.includes(query) ||
			(command.description || '').toLowerCase().includes(query))
		.sort((a, b) => a.name.localeCompare(b.name));

	if (!commands.length)
		return await interaction.reply({
			content: `Nothing matches "${query}", try /help with no query to see everything.`,
			ephemeral: true
		});

	const lines = [
		query ? `**Commands matching "${query}"**` : '**Cooper commands**',
		...commands.map(command => `\`/${command.name}\` - ${command.description}`)
	];

	return await interaction.reply({ content: lines.join('\n'), ephemeral: true });
};
