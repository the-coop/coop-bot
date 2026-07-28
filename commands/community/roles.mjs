import { SlashCommandBuilder } from "discord.js";

import SelfRolesHelper from "../../operations/members/hierarchy/roles/selfRolesHelper.mjs";

export const name = 'roles';

export const description = 'Opt in and out of the roles you manage yourself';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description);

export const execute = async (interaction) => SelfRolesHelper.open(interaction);
