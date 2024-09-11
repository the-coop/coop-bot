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
    };

    static createVC(member) {
        const config = this.calcConfig(member);
        return SERVER._coop().channels.create(config);
    };

    static calcConfig(member) {
        return {
            name: `${member.displayName}'s VC`,
            type: ChannelType.GuildVoice,
            permissionOverwrites: [
                {
                    id: member.id,
                    allow: [
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.ManageRoles,
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
    };

    static async cleanupUnused() {
        SERVER._coop().channels.cache

            // Filter to custom created VCs.
            .filter(channel => {
                // If text channel, filter out.
                if (channel.type === ChannelType.GuildText) return false;

                // Prevent deletion of create-yours vc.
                if (channel.id === CHANNELS_CONFIG.CREATE_SOCIAL.id) return false;

                // Prevent deletion of public VC.
                if (channel.id === CHANNELS_CONFIG.PUBLIC_VC.id) return false;

                // Prevent deletion of an active custom VC.
                if (channel.members.size > 0) return false;

                // Limit clean up to top level.
                if (channel?.parent?.id) return false;

                return true;
            })

            // Delete all of the unused VCs.
            .map(async vc => {
                try {
                    await vc.delete();
                } catch(e) {
                    console.error(e);
                    console.log('Error deleting social custom channel');
                }
            });
    };
};
