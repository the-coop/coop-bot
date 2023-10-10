import { CHANNELS } from '../../../coop.mjs';

export default class FoxHuntMinigame {

    // Consider a droptable but start with gifts or random drops

    // If someone uses a fox, it could give the person all fox stolen eggs while buff lasts
    
    static async run() {
        // Stop crate drop being based on a fixed time, could do that with chopper minigame instead.
        console.log('running fox hunt minigame');

        CHANNELS._send('TALK', '🦊');
    }

}