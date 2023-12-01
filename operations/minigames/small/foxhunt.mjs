import { CHANCE, CHANNELS, USERS } from '../../../coop.mjs';


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

            console.log('is fox hunt action');

        } catch(e) {
            console.error(e);
            console.log('Above error related to foxhunt reaction handler')
        }
    }

    static countLives(str) {
        const halfLivesRegex = new RegExp('💔', "g");
        const fullLivesRegex = new RegExp('❤️', "g");
        const fullLives = str.match(fullLivesRegex) || 0;
        const halfLives = str.match(halfLivesRegex) || 0;
        return (halfLives * .5) + fullLives;
    }

    static async run() {
        // Stop crate drop being based on a fixed time, could do that with chopper minigame instead.
        console.log('running fox hunt minigame');

        const testChannel = CHANNELS._get('1161224626794414172');

        const lives = CHANCE.natural({ min: 3, max: 12 });

        // CHANNELS._send('TALK', '🦊');
        const msg = await testChannel.send(`🦊${liveIcon.repeat(lives)}`);

        console.log(msg.content);
        this.countLives(msg.content);

        msg.react(slapIcon);
        msg.react(petIcon);
    }

}