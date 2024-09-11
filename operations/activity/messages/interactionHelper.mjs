import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default class InteractionHelper {

    static async onInteract(interaction) {

    };

    static confirm(interaction, texts) {
        return new Promise((resolve, reject) => {
            // Show confirmation and prompt.
            const ConfirmationActions = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm')
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                );

            interaction.reply({ content: texts.preconfirmationText, components: [ConfirmationActions], ephemeral: true });

            const collector = interaction.channel.createMessageComponentCollector(
                { filter: i => !!i, time: 15000 }
            );
            collector.on('collect', i => {
                i.update({ content: i.customId === 'confirm' ? 
                        texts.confirmText : texts.cancelText, 
                    components: [], 
                    ephemeral: true 
                });

                resolve(i.customId === 'confirm');
            });

            // Handle timeout (no selection).
            collector.on('end', () => resolve(false));
        });
    };

};