import { CHANCE, CHANNELS, CHICKEN, USERS } from '../../../coop.mjs';

const halflifeicon = '💔';
const liveIcon = '❤️';
const slapIcon = '🫱';
const petIcon = '🖐️';

export default class FoxHuntMinigame {

    // Consider a droptable but start with gifts or random drops

    // If someone uses a fox, it could give the person all fox stolen eggs while buff lasts

    // Add sparkles sometimes after the fox is slapped and delay reactions while it's in the message.
    // :sparkles: 
    
    static async onReaction(reaction, user) {
        try {
            // Prevent Cooper from triggering game.
            if (USERS.isCooper(user.id)) return false;

            // Foxhunt is limited to Cooper messages.
            const isCooperMessage = USERS.isCooperMsg(reaction.message);
            if (!isCooperMessage) return false;

            const isFoxhuntAction = [slapIcon, petIcon].includes(reaction.emoji.name);
            if (!isFoxhuntAction) return false;

            // Add viisble response to prove it's hooked up.
            console.log('is fox hunt action');
            if (CHANCE.natural({ min: 1, max: 12 }) > 6)
                await CHANNELS._send('TALK', `Careful the 🦊 bites.`);

            // 10% Chance to reward user with stolen eggs
            if (CHANCE.bool({ likelihood: 10 })) {
                const msg = await CHANNELS._send('TALK', `Fox is feeling generous!`);
                // Ensure message is stored in database for clear up.
                TemporaryMessages.add(msg, 30 * 60);
                // await this.reward(user);
            }


        } catch(e) {
            console.error(e);
            console.log('Above error related to foxhunt reaction handler')
        }
    };

    static countLives(str) {
        const halfLivesRegex = new RegExp('💔', "g");
        const fullLivesRegex = new RegExp('❤️', "g");
        const fullLives = str.match(fullLivesRegex) || 0;
        const halfLives = str.match(halfLivesRegex) || 0;
        return (halfLives * .5) + fullLives;
    };

    // Get all stolen eggs from database and give them to the user
    static async reward(user) {
        await Promise.all(
            ['AVERAGE_EGG', 'RARE_EGG', 'LEGENDARY_EGG', 'TOXIC_EGG'].map(async (rarity) => {
                const stolenKey = `stolen_${rarity.toLowerCase()}`;
                const eggCount = await CHICKEN.getConfigVal(stolenKey);
                if (eggCount > 0) {
                    await Items.add(user.id, rarity, eggCount, `FOXHUNT_REWARD_${rarity}`);
                    await CHICKEN.setConfig(stolenKey, 0);
                }
            })
        );
    };

    static async run() {
        // Stop crate drop being based on a fixed time, could do that with chopper minigame instead.
        console.log('running fox hunt minigame');

        const lives = CHANCE.natural({ min: 3, max: 12 });
        const msg = await CHANNELS._send('TALK', `🦊${liveIcon.repeat(lives)}`);

        console.log(msg.content);
        this.countLives(msg.content);

        msg.react(slapIcon);
        msg.react(petIcon);
    };

};