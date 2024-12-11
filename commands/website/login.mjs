import { SlashCommandBuilder } from "discord.js";
import { USERS } from '../../coop.mjs';

import AccessCodes from "coop-shared/services/access-codes.mjs";


export const name = 'login';

export const description = 'Conveniently login to The Coop website';
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description);

export const execute = async (interaction) => {
	// Generate a saved code the web api to authenticate on link visit.
	const link = await AccessCodes._createLink(interaction.user.id);

	// DM the login code to the user
	// USERS._dm(interaction.user.id, 
	// 	`**Your temporary login code (expiring link) is here, use it within the next 5 minutes:**\n\n` +
	// 	'||' + link + '||'
	// );

	// Indicate success.
	return await interaction.reply({ content: '||' + link + '||', ephemeral: true });
};

