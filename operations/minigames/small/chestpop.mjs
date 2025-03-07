import { STATE, ITEMS, MESSAGES, CHANNELS, INTERACTION } from "../../../coop.mjs";
import TemporaryMessages from "../../activity/maintenance/temporaryMessages.mjs";
import Useable from "coop-shared/services/useable.mjs";
import DropTable from "../medium/economy/items/droptable.mjs";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import EconomyNotifications from '../../activity/information/economyNotifications.mjs';

export default class ChestPopMinigame {
    
    // Reaction interceptor to check if user is attempting to interact.
    static async onInteraction(interaction) {
        // Chest Pop minigame guards. 
        if (interaction.customId !== "open_chest" && interaction.customId !== "pickup_item") return false;

        // Allow user the open the chest.
        if (interaction.customId === 'open_chest')
            this.open(interaction);

        // Allow user to pick up the first item
        if (interaction.customId === 'pickup_item')
            ITEMS.collectFromTable(interaction);
    };

    static async open(interaction) {
        // Use a key attempting to open the chest.
        const paid = await Useable.use(interaction.user.id, 'KEY', 1);
        if (!paid) return await INTERACTION.reply(interaction, 'You have no keys.');

        // Handle broken key possibility.
        if (STATE.CHANCE.bool({ likelihood: 15 })) 
            return await INTERACTION.reply(interaction, 'You broke a key attemping to open it.');

        // Pick rewards from opening with key
        const maxRewardAmount = STATE.CHANCE.natural({ min: 2, max: 5 });
        const rewardAmount = STATE.CHANCE.natural({ min: 1, max: maxRewardAmount });
        const drops = DropTable.getRandomWithQtyMany(rewardAmount);

        // Destroy the chestpop message
        await interaction.message.delete()
        
        // Declare feedback in a new message
        const dropsText = drops.map(drop => MESSAGES.emojiCodeText(drop.item).repeat(drop.qty)).join(' ');
        const dropsMessage = await interaction.channel.send({
            content: dropsText,
            components: [
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setEmoji('✋')
                        .setLabel("Pick up")
                        .setCustomId('pickup_item')
                        .setStyle(ButtonStyle.Primary)
                ])
            ]
        });
        
        // Store the new drops message in temp messages
        TemporaryMessages.add(dropsMessage, 30 * 60);

        // Track chestpop drops in economy statistics.
        EconomyNotifications.add('CHESTPOP', {
            loot: drops.length
        });
            
        // Show user success message.
        return await INTERACTION.reply(interaction, `You successfully opened the chest.`);
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
