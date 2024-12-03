import { GatewayIntentBits, Client } from "discord.js";

import setupCommands from './commands.mjs';

import joined from "../operations/activity/welcome/joined.mjs";
import left from "../operations/activity/welcome/left.mjs";
import messageAddedHandler from "../operations/activity/messageAdded.mjs";
import reactAddedHandler from "../operations/activity/reactionAdded.mjs";

import CompetitionHelper from "../operations/social/competitionHelper.mjs";
import ProjectsHelper from "../operations/productivity/projects/projectsHelper.mjs";
import BlogHelper from "../operations/marketing/blog/blogHelper.mjs";
import SocialHelper from "../operations/social/socialHelper.mjs";
import messageDeletedHandler from "../operations/activity/messageDeleted.mjs";

export default async () => {
    // Instantiate the client.
    const client = new Client({ 
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildVoiceStates
        ]
    });

    // Setup the slash and local commands.
    setupCommands(client);

    // Add handler for reaction added
    client.on('messageReactionAdd', reactAddedHandler);

    // Handler for a new member has joined
    client.on("guildMemberAdd", joined);
    client.on('guildMemberRemove', left);

    // Message interceptors.
    client.on("messageCreate", messageAddedHandler);
    client.on('messageDelete', messageDeletedHandler);

    // Social VC connection interception.
    client.on("voiceStateUpdate", (prev, curr) => SocialHelper.onStateChange(prev, curr));

    // Channel modification interceptors.
    client.on('channelUpdate', chanUpdate => {
        // Persist project channel topic title and topic descriotion.
        ProjectsHelper.onChannelUpdate(chanUpdate);

        // Persist project channel topic title and topic descriotion.
        BlogHelper.onChannelUpdate(chanUpdate);
    });

    return client;
}