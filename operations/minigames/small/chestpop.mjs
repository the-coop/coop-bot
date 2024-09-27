import EconomyNotifications from "../../activity/information/economyNotifications.mjs";

import SkillsHelper from "../medium/skills/skillsHelper.mjs";

import UsableItemHelper from "../medium/economy/items/usableItemHelper.mjs";

import { STATE, REACTIONS, ITEMS, MESSAGES, USERS, CHANNELS, ROLES } from "../../../coop.mjs";
import { EMOJIS } from "coop-shared/config.mjs";
import Statistics from "../../activity/information/statistics.mjs";
import TemporaryMessages from "../../activity/maintenance/temporaryMessages.mjs";
import Items from "coop-shared/services/items.mjs";
import Useable from "coop-shared/services/useable.mjs";

export default class ChestPopMinigame {
    
    // Reaction interceptor to check if user is attempting to interact.
    static async onInteraction(interaction) {
        const { message, channel, user } = interaction;

        // High chance of preventing any Woodcutting at all to deal with rate limiting.
        if (STATE.CHANCE.bool({ likelihood: 50 })) return false;

        // Chest Pop minigame guards.
        const isCooperMsg = USERS.isCooperMsg(message);
        if (!isCooperMsg) return false;
        
        // Check this message content is correct and from cooper.
        const msgContent = message.content;
        const isChestPopMsg = msgContent.includes("ChestPop?");
        const isInteractionButton = interaction.customId === "open_chest";
        if (!isChestPopMsg || !isInteractButton) return false;

        // Allow user to cut the open the chest.
        this.open(message, channel, user, interaction);
    }

    static async open(msg, channel, user, interaction) {

        // Check if has a key
        const userKeysNum = await Items.getUserItemQty(user.id, 'KEY');
        const noText = `${user.username} tried to open the chest, but doesn't have a key.`;
        if (userKeysNum <= 0) {
            await interaction.reply({ content: noText, ephemeral: true });
            return MESSAGES.silentSelfDestruct(msg, noText, 0, 3333);
        }

        // TODO: Rewards from opening with key
        
    };

    static async run() {
        try {
            const eventChannel = CHANNELS._randomSpammable();

            const chestPopMsg = await eventChannel.send('ChestPop? 💰');
            chestPopMsg.edit({ 
                components: [
                    new ActionRowBuilder().addComponents([
                        new ButtonBuilder()
                            .setEmoji('🔑')
                            .setLabel("Open")
                            .setCustomId('open_chest')
                            .setStyle(ButtonStyle.Primary)
                    ])
                ]
            });
            // Ensure message is stored in database for clear up.
            // TODO: Count as ungathered chest pop in activity messages
            TemporaryMessages.add(chestPopMsg, 30 * 60);
        } catch(e) {
            console.log('above error occurred trying to start chest pop minigame');
        }
    };
}