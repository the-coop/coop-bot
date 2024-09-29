import { STATE, REACTIONS, ITEMS, MESSAGES, USERS, CHANNELS, ROLES } from "../../../coop.mjs";
import TemporaryMessages from "../../activity/maintenance/temporaryMessages.mjs";
import Useable from "coop-shared/services/useable.mjs";
import DropTable from "../medium/economy/items/droptable.mjs";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import EconomyNotifications from '../../activity/information/economyNotifications.mjs';

export default class ChestPopMinigame {
    
    // Reaction interceptor to check if user is attempting to interact.
    static async onInteraction(interaction) {
        // Chest Pop minigame guards.
        if (!USERS.isCooperMsg(interaction.message)) return false;
        if (interaction.customId !== "open_chest") return false;

        // Allow user the open the chest.
        this.open(interaction);
    };

    static async open(interaction) {
        try {
            // Use a key attempting to open the chest.
            const paid = await Useable.use(interaction.user.id, 'KEY', 1);
            if (!paid) return await interaction.reply({ content: 'You have no keys.', ephemeral: true });
    
            // Handle broken key possibility.
            if (STATE.CHANCE.bool({ likelihood: 15 })) 
                return await interaction.reply({ content: 'You broke a key attemping to open it.', ephemeral: true });
    
            // Pick rewards from opening with key
            const maxRewardAmount = COOP.STATE.CHANCE.natural({ min: 3, max: 7 });
            const rewardAmount = COOP.STATE.CHANCE.natural({ min: 1, max: maxRewardAmount });
            const drops = DropTable.getRandomWithQtyMany(rewardAmount);
    
            // Declare feedback.
            const dropsText = drops.map(drop => COOP.MESSAGES.emojiCodeText(drop.item).repeat(drop.qty));
            await interaction.message.edit(dropsText);
    
            // Track chestpop drops in economy statistics.
            EconomyNotifications.add('CHEST_POP', {
                loot: drops.length
            });
                
            // Show user success message.
            return await interaction.reply({ content: `You successfully opened the chest.`, ephemeral: true });

        } catch(e) {
            console.error(e);
            console.log('Error opening chestpop');
        }
    };

    static async run() {
        try {
            const msg = await CHANNELS._randomSpammable().send('ChestPop? 💰');
            msg.edit({ 
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
            TemporaryMessages.add(msg, 30 * 60);
        } catch(e) {
            console.error(e);
            console.log('Chestpop error running.');
        }
    };
};
