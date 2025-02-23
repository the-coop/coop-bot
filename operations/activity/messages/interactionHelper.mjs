import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import WoodcuttingMinigame from '../../minigames/small/woodcutting.mjs';
import TradingHelper from '../../minigames/medium/economy/items/tradingHelper.mjs';
import CompetitionHelper from '../../social/competitionHelper.mjs';
import MiningMinigame from '../../minigames/small/mining.mjs';
import ChestPopMinigame from '../../minigames/small/chestpop.mjs';
import FoxHuntMinigame from "../../minigames/small/foxhunt.mjs";
import DailyRewardMinigame from "../../minigames/small/dailyreward.mjs";
import AlgoHelper from '../../minigames/medium/economy/blockchain/AlgoHelper.mjs';

export const Button = (emoji, label, customId, style) => new ButtonBuilder({ emoji, label, customId, style })

const ConfirmButton = Button('✅', 'Confirm', 'confirm', ButtonStyle.Success);
const CancelButton = Button('❌', 'Cancel', 'cancel', ButtonStyle.Danger);

export default class InteractionHelper {

    static async _onInteraction(interaction) {
        // Handle competition buttons and modal.
        CompetitionHelper.onInteraction(interaction);

        // Handle trading buttons (accept_trade, trade_cancel).
        TradingHelper.onInteraction(interaction);
    
        // Add woodcutting/mining and new interaction handlers.
        WoodcuttingMinigame.onInteraction(interaction);
        MiningMinigame.onInteraction(interaction);
        ChestPopMinigame.onInteraction(interaction);
        FoxHuntMinigame.onInteraction(interaction);

        // Daily Reward Interaction
        DailyRewardMinigame.onInteraction(interaction);
    };

    static confirm(interaction, texts) {
        return new Promise((resolve, reject) => {
            // Send the confirm/reject prompt.
            const components = [new ActionRowBuilder({ components: [ ConfirmButton, CancelButton ] })];
            interaction.reply({ content: texts.preconfirmationText, components, ephemeral: true });

            // Setup a collector awaiting confirmation/rejection.
            const collector = interaction.channel.createMessageComponentCollector(
                { filter: i => !!i, time: 15000 }
            );
            collector.on('collect', i => {
                i.update({ 
                    content: i.customId === 'confirm' ? texts.confirmText : texts.cancelText, 
                    components: [], 
                    ephemeral: true 
                });

                resolve(i.customId === 'confirm');
            });

            // Handle timeout (no selection).
            collector.on('end', () => resolve(false));
        });
    };

    static async reply(interaction, message, fuse = 6000) {
        // Send the reply and keep a reference.
        await interaction.reply({ content: message, ephemeral: true });

        // Setup the deletion and do not return a reply reference, it cannot be reused.
        return setTimeout(async () => {
            try {
                interaction.deleteReply('@original');
            } catch (e) {
                // user already dismissed or original deleted, suppress.
            }
        }, fuse); 
    };

};