import { SlashCommandBuilder } from "@discordjs/builders";
// import COOP, { ROLES, USERS } from '../../coop.mjs';
// import { CHANNELS } from 'coop-shared/config.mjs';

export const name = 'voiceban';

export const description = 'Voiceban a user.';
    
export const examples = '/voiceban <@user> <reason>';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)

	.addUserOption(option => 
		option
			.setName('ban_user')
			.setDescription('Who would you like to ban from your VC?')
			.setRequired(true)
	)
	.addStringOption(option => 
		option
			.setName('ban_reason')
			.setDescription('Optional feedback/ban reason.')
			.setRequired(true)
	);


export const execute = async (interaction) => {
	try {
		interaction.reply({ content: 'Work in progress...', ephemeral: false });

	} catch(e) {
		console.error(e);
		console.log('!stand failed.');
	}
};

