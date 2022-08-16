import { SlashCommandBuilder } from "@discordjs/builders";
import { USERS } from '../../organisation/coop.mjs';
import TempAccessCodeHelper from '../../operations/members/tempAccessCodeHelper.mjs';

export const name = 'login';

export const description = 'Conveniently login to The Coop website';
    
export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description);

export const execute = async (interaction) => {
	// Generate a saved code the web api to authenticate on link visit.
	const code = await TempAccessCodeHelper.create(interaction.user.id);

	// DM the login code to the user
	USERS._dm(interaction.user.id, 
		`**Your temporary login code (expiring link) is here, use it within the next 5 minutes:**\n\n` +
		'||https://thecoop.group/auth/authorise?method=cooper_dm&code=' + code + '||'
	);

	// Indicate success.
	return await interaction.reply('Login link was securely DMed to you.')
};

