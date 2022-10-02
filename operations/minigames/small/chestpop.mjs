import { CHANNELS } from "../../../coop.mjs";

export default class ChestPopMinigame {

    // TODO: Turn chest pop into a simple gold coin release.
    static run() {
        CHANNELS._send('TALK', 'ChestPop? 💰');
    }
    
}