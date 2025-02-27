import { CHANCE, CHANNELS, CHICKEN, INTERACTION } from '../../../coop.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import TemporaryMessages from '../../activity/maintenance/temporaryMessages.mjs';
import Items from "coop-shared/services/items.mjs";

const halflifeicon = '💔';
const liveIcon = '❤️';
const slapIcon = '🫱';
const petIcon = '🖐️';

export default class FoxHuntMinigame {

    static stunned = false;

    static async onInteraction(interaction) {
        try {
            // Foxhunt safeguards
            const isFoxhuntAction = (interaction.customId === 'slap_fox' || interaction.customId === 'pet_fox');
            if (!isFoxhuntAction) return false;

            // If fox is currently stunned
            // 10% chance of giving user 1 point
            if (this.stunned) {
                const stunnedOutcomes = [
                    () => this.rewardStun(interaction),
                    () => INTERACTION.reply(interaction, '✨🦊💫')
                ];
                const stunnedWeights = [10, 100];

                // Pick a stunned outcome and immediately return it
                return await CHANCE.weighted(stunnedOutcomes, stunnedWeights)();
            };

            // Consumes hearts for each interaction
            const heartStatus = await this.canConsumeHeart(interaction);
            if (!heartStatus.canConsume)
                return await INTERACTION.reply(interaction, 'The fox is sleeping now');

            // If after consuming a heart, there is 0 left and user has slapped the fox
            if (interaction.customId === 'slap_fox' && heartStatus.lastHeart)
                return await this.lastHeartSlap(interaction);

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
                    () => INTERACTION.reply(interaction, 'The fox dodges your slap!')
                ];
                weights = [30, 50, 100];
            }
            
            if (interaction.customId === 'pet_fox') {
                outcomes = [
                    () => this.reward(interaction),
                    () => INTERACTION.reply(interaction, 'The fox sits next to you!')
                ];
                weights = [10, 100];
            }

            // Select a single outcome
            const action = CHANCE.weighted(outcomes, weights);
            return await action();

        } catch(e) {
            console.error(e);
            console.log('Above error related to foxhunt reaction handler')
            return await INTERACTION.reply(interaction, 'The fox ran from you!');
        }
    };

    static async bite(interaction) {
        await Items.subtract(interaction.user.id, 'COOP_POINT', 1, 'Fox bite');
        return await INTERACTION.reply(interaction, 'Careful the 🦊 bites. -1 Points!');
    };

    static async love(interaction) {
        return await INTERACTION.reply(interaction, 'The fox loves you ❤️');
    };

    // During stun, interactions have very small chance of giving user a point
    // This aims to negate the bite functions point substraction
    static async rewardStun(interaction) {
        await Items.add(interaction.user.id, 'COOP_POINT', 1, 'Fox stunned reward');
        return await INTERACTION.reply(interaction, 'You help the stunned 🦊 +1 Points!');
    };

    // Adds sparkles to the fox message and stuns the fox, preventing actions for 8 seconds
    static async stunFox(interaction) {
        // Respond to interaction
        await INTERACTION.reply(interaction, 'You stunned the fox! ✨🦊💫');

        const messageContent = interaction.message.content;
        // Edit the original message to show sparkles and take away the hearts
        await interaction.message.edit(`✨💫🦊`);

        // Set fox stunned for 8 seconds
        this.stunned = true;
        setTimeout(async () => {
            this.stunned = false;
            // Edit the message back to its original state
            await interaction.message.edit(`${messageContent}`);
        }, 8000);
    };

    // If the user slaps on last heart, reward 10 points
    static async lastHeartSlap(interaction) {
        await Items.add(interaction.user.id, 'COOP_POINT', 10, 'Fox last heart slap');
        return await INTERACTION.reply(interaction, '🦊 dropped a treasure 💎 +10 Points!');
    };

    static async canConsumeHeart(interaction) {
        let { fullLives, halfLives } = this.countLives(interaction.message.content);
        if (fullLives == 0) return { canConsume: false, lastHeart: false };
        // Check if it was the last full heart
        const lastHeart = (fullLives === 1);
        fullLives--;
        halfLives++;
        await interaction.message.edit(`🦊${liveIcon.repeat(fullLives)}${halflifeicon.repeat(halfLives)}`);
        return { canConsume: true, lastHeart };
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

        return await INTERACTION.reply(interaction, rewardMessage);
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