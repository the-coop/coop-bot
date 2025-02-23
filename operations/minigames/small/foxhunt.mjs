import { CHANCE, CHANNELS, CHICKEN, USERS } from '../../../coop.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import TemporaryMessages from '../../activity/maintenance/temporaryMessages.mjs';
import Items from "coop-shared/services/items.mjs";

const halflifeicon = '💔';
const liveIcon = '❤️';
const slapIcon = '🫱';
const petIcon = '🖐️';

export default class FoxHuntMinigame {

    // Consider a droptable but start with gifts or random drops

    // If someone uses a fox, it could give the person all fox stolen eggs while buff lasts

    // Add sparkles sometimes after the fox is slapped and delay reactions while it's in the message.
    // :sparkles: 
    static stunned = false;

    static async onInteraction(interaction) {
        try {
            // Foxhunt safeguards
            const isFoxhuntAction = (interaction.customId === 'slap_fox' || interaction.customId === 'pet_fox');
            if (!isFoxhuntAction) return false;

            // If fox is currently stunned
            if (this.stunned)
                return await this.sendEphemeralReply(interaction, '✨🦊💫');

            // Consumes hearts for each interaction
            if (!this.canConsumeHeart(interaction))
                return await this.sendEphemeralReply(interaction, 'The fox is sleeping now');

            // If user is sunz
            if (interaction.user.id === "287062661483724810")
                await this.love(interaction);

            // Define possible outcomes for each interaction
            let outcomes = [];
            let weights = [];

            if (interaction.customId === 'slap_fox') {
                outcomes = [
                    () => this.stunFox(interaction),
                    () => this.bite(interaction),
                    () => this.sendEphemeralReply(interaction, 'The fox dodges your slap!')
                ];
                weights = [50, 50, 100];
            } 
            
            if (interaction.customId === 'pet_fox') {
                outcomes = [
                    () => this.reward(interaction),
                    () => this.sendEphemeralReply(interaction, 'The fox sits next to you!')
                ];
                weights = [10, 100];
            }

            // Select a single outcome
            const action = CHANCE.weighted(outcomes, weights);
            return await action();

        } catch(e) {
            console.error(e);
            console.log('Above error related to foxhunt reaction handler')
            return await this.sendEphemeralReply(interaction, 'The fox ran from you!');
        }
    };

    // TODO: Move this method to a COOP base class to make it reusable
    static async sendEphemeralReply(interaction, message) {
        const reply = await interaction.reply({ content: message, ephemeral: true });
        setTimeout(async () => {
            try {
                interaction.deleteReply('@original');
                // console.log('Ephemeral message auto-deleted');
            } catch (error) {
                // console.error('Failed to auto-delete ephemeral message:', error);
            }
        }, 10000); 
    };

    static async bite(interaction) {
        await Items.subtract(interaction.user.id, 'COOP_POINT', 1, 'Fox bite');
        return await this.sendEphemeralReply(interaction, 'Careful the 🦊 bites.');
    };

    static async love(interaction) {
        return await this.sendEphemeralReply(interaction, 'The fox loves you ❤️');
    };

    // Adds sparkles to the fox message and stuns the fox, preventing actions for 8 seconds
    static async stunFox(interaction) {
        // Respond to interaction
        await this.sendEphemeralReply(interaction, 'You stunned the fox! ✨🦊💫');

        const messageContent = interaction.message.content;
        // Edit the original message to show sparkles
        await interaction.message.edit(`✨💫${messageContent}`);

        // Set fox stunned for 8 seconds
        this.stunned = true;
        setTimeout(async () => {
            this.stunned = false;
            // Edit the message back to its original state
            await interaction.message.edit(`${messageContent}`);
        }, 8000);
    };

    static async canConsumeHeart(interaction) {
        let { fullLives, halfLives } = this.countLives(interaction.message.content);
        if (fullLives == 0) return false;
        fullLives--;
        halfLives++;
        await interaction.message.edit(`🦊${liveIcon.repeat(fullLives)}${halflifeicon.repeat(halfLives)}`);
        return true;
    };

    static countLives(str) {
        const halfLivesRegex = new RegExp('💔', "g");
        const fullLivesRegex = new RegExp('❤️', "g");
        const fullLives = (str.match(fullLivesRegex) || []).length;
        const halfLives = (str.match(halfLivesRegex) || []).length;
        return { fullLives, halfLives };
    };

    // Get all stolen eggs from database and give them to the user
    static async reward(interaction) {
        let rewardStrings = []

        await Promise.all(
            ['AVERAGE_EGG', 'RARE_EGG', 'LEGENDARY_EGG', 'TOXIC_EGG'].map(async (rarity) => {
                const stolenKey = `stolen_${rarity.toLowerCase()}`;
                const eggCount = await CHICKEN.getConfigVal(stolenKey);
                if (eggCount > 0) {
                    await Items.add(interaction.user.id, rarity, eggCount, `FOXHUNT_REWARD_${rarity}`);
                    await CHICKEN.setConfig(stolenKey, 0);
                    rewardStrings.push(`${rarity}: ${eggCount}`);
                }
            })
        );

        const rewardMessage = rewardStrings.length > 0
            ? `The fox brings you gifts...\n${rewardStrings.join('\n')}`
            : 'The fox is feeling generous!';

        return await this.sendEphemeralReply(interaction, rewardMessage);
    };

    static async run() {
        console.log('running fox hunt minigame');

        const lives = CHANCE.natural({ min: 3, max: 12 });
        const msg = await CHANNELS._send('TALK', `🦊${liveIcon.repeat(lives)}`);
        msg.edit({ components: [
            new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setEmoji(petIcon)
                    .setLabel("Pet")
                    .setCustomId('pet_fox')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setEmoji(slapIcon)
                    .setLabel("Slap")
                    .setCustomId('slap_fox')
                    .setStyle(ButtonStyle.Danger),
            ])]
        });

        // Ensure message is stored in database for clear up.
        TemporaryMessages.add(msg, 30 * 60);
    };

};