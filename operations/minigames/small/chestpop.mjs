import { CHANNELS } from "../../../../coop.mjs";

export default class ChestPopMinigame {

    static run() {
        CHANNELS._send('TALK', 'ChestPop? 💰');
    }
    
}