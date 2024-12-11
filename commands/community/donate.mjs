import { SlashCommandBuilder } from "discord.js";

export const name = 'donate';

export const description = 'Prompt shilling for 2 servers (game + bot/api), domain and database!';
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description);

export const execute = async (interaction) => {
	const shillingText = `I'm sorry, I can't shill right now, working on copywriting for the begging`;
	return await interaction.reply(shillingText);
};
