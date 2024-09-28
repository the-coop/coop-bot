import EconomyNotifications from "../../activity/information/economyNotifications.mjs";

import SkillsHelper from "../medium/skills/skillsHelper.mjs";

import UsableItemHelper from "../medium/economy/items/usableItemHelper.mjs";

import { STATE, REACTIONS, ITEMS, MESSAGES, USERS, CHANNELS, ROLES } from "../../../coop.mjs";
import { EMOJIS } from "coop-shared/config.mjs";
import Statistics from "../../activity/information/statistics.mjs";
import TemporaryMessages from "../../activity/maintenance/temporaryMessages.mjs";
import Items from "coop-shared/services/items.mjs";
import Useable from "coop-shared/services/useable.mjs";
import DropTable from "../medium/economy/items/droptable.mjs";

export default class ChestPopMinigame {
    
    // Reaction interceptor to check if user is attempting to interact.
    static async onInteraction(interaction) {
        const { message, channel, user } = interaction;

        // Chest Pop minigame guards.
        const isCooperMsg = USERS.isCooperMsg(message);
        if (!isCooperMsg) return false;
        
        // Check this message content is correct and from cooper.
        const msgContent = message.content;
        const isChestPopMsg = msgContent.includes("ChestPop?");
        if (!isChestPopMsg) return false;
        const isInteractionButton = interaction.customId === "open_chest";
        if (!isInteractButton) return false;

        // Allow user the open the chest.
        this.open(message, channel, user, interaction);
    };

    static async open(msg, channel, user, interaction) {

        // Check if has a key
        const userKeysNum = await Items.getUserItemQty(user.id, 'KEY');
        const noText = `${user.username} tried to open the chest, but doesn't have a key.`;
        if (userKeysNum <= 0) {
            await interaction.reply({ content: noText, ephemeral: true });
            return MESSAGES.silentSelfDestruct(msg, noText, 0, 3333);
        }

        const keyBreakPerc = 15;
        const didBreak = STATE.CHANCE.bool({ likelihood: keyBreakPerc });
        if (didBreak) {
            const keyUpdate = await Useable.use(user.id, 'KEY', 1);
            if (keyUpdate) {
                const actionText = `${user.username} broke a key while trying to open a chest, ${userKeysNum - 1} remaining!`;
                return await interaction.reply({ content: actionText, ephemeral: true });
            }
        } else {
            // Delete the chestpop message
            await msg.delete();

            // Pick rewards from opening with key
            const maxRewardAmount = 4;
            const rewardAmount = COOP.STATE.CHANCE.natural({ min: 1, max: maxRewardAmount });
            const drops = DropTable.getRandomWithQtyMany(rewardAmount);

            // Add the items to user
            await Promise.all(drops.map(drop =>
                Items.add(user.id, drop.item, drop.qty, 'ChestPop')
            ));

            // Declare feedback.
            const chestOpenText = `You successfully opened the chest and found the following items\n\n` +
                drops.map(drop => 
                    `${COOP.MESSAGES.emojiCodeText(drop.item)}x${drop.qty}`
                ).join(', ');

            // TODO: Track chestpop drops in economy statistics?
                
            // Show user success message.
            return await interaction.reply({ content: chestOpenText, ephemeral: true });
        }
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