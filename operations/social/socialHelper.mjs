import { CATEGORIES, CHANNELS as CHANNELS_CONFIG } from "coop-shared/config.mjs";
import { ChannelType, PermissionsBitField } from "discord.js";
import { CHANNELS, SERVER } from "../../coop.mjs";

export default class SocialHelper {

    static async onStateChange(prev, curr) {
        try {
            const channel = curr?.channel || null;

            // Ignore disconnects (null) or other VC channel joins besides "create-yours" VC.
            if (channel?.id === CHANNELS_CONFIG.CREATE_SOCIAL.id)
                // Process the queue of joiners.
                await Promise.all(channel.members.map(async member => {
                    try {
                        const vc = await this.createVC(member);
                        return await member.voice.setChannel(vc);
                    } catch(e) {
                        console.log('Error creating VC or setting user to that VC');
                        console.error(e);
                        return null;
                    }
                }));
    
            // Check if any need cleaning up.
            this.cleanupUnused();
            
        } catch(e) {
            console.error(e);
            console.log('Error with create your own channel state change ^');
        }
    }

    static createVC(member) {
        const config = this.calcConfig(member);
        return SERVER._coop().channels.create(config);
    }

    static calcConfig(member) {
        return {
            name: `${member.displayName}'s VC`,
            type: ChannelType.GuildVoice,
            parent: CATEGORIES.SOCIAL.id,

            // Set the owner and their permissons.
            permissionOverwrites: [
                {
                    id: member.id,
                    allow: [
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.MoveMembers,
                        PermissionsBitField.Flags.MuteMembers,
                        PermissionsBitField.Flags.DeafenMembers,
                        PermissionsBitField.Flags.PrioritySpeaker
                    ]
                }
            ],
            reason: 'Custom VC',
            position: 9999
        }
    }

    static async cleanupUnused() {
        const category = CHANNELS._get(CATEGORIES.SOCIAL.id);
        const unusedVCs = category.children.cache.filter(channel => {
            // If text channel, filter out.
            if (channel.type === ChannelType.GuildText)
                return false;

            // If create-yours channel, filter out.
            if (channel.id === CHANNELS_CONFIG.CREATE_SOCIAL.id)
                return false;

            // If it has members (active), filter out.
            if (channel.members.size > 0)
                return false;

            return true;
        });

        // Delete all of the unused VCs.
        unusedVCs.map(vc => vc.delete());
    }
}