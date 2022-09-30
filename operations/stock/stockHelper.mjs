import { 
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	entersState,
	AudioPlayerStatus,
	VoiceConnectionStatus,
    NoSubscriberBehavior
} from '@discordjs/voice';
import axios from 'axios';
import moment from 'moment';
import { CHANNELS, ROLES } from '../../coop.mjs';
import Chicken from "../chicken.mjs";


export default class StockHelper {

    static US_OPEN = false;

    // This is only active from next election interval moment to a week after that
    static async isMarketOpen() {
        return await Chicken.getConfigVal('market_open') === 'true';
    }

    static setMarketOpen(state) {
        return Chicken.setConfig('market_open', state);
    }

    static async getEST() {
        const { data } = await axios.get('https://worldtimeapi.org/api/timezone/EST');
        const date = moment.parseZone(data.datetime);
        return date;
    }

    static async update() {
        const date = await this.getEST();

        // Check if weekday.
        const isESTWeekday = ![0, 6].includes(date.day());

        // NYSE open Monday-Friday, 9:30 a.m. to 4:00 p.m. EST.
        const afterOpen = (date.hours() === 8 && date.minutes() >= 30) || date.hours() >= 9;

        // Check the hour has not yet reached 4pm EST.
        const beforeClose = date.hours() < 15;

        // Check persisted state [Script awareness of openness].
        const currentlyOpen = await this.isMarketOpen();

        // This may be problematic at the end/start of the week???
        if (!isESTWeekday) 
            return false;

        // Intercept market opening and handle it.
        if (currentlyOpen && afterOpen && !beforeClose) {
            this.setMarketOpen(false);

            CHANNELS._send('STOCKS_VC_TEXT', "Setting stock market closed");

            console.log("Setting stock market closed");

            // Announce open at the end until another file created (testing).
            // this.announce();
        }

        // Detect and handle market closing.
        if (!currentlyOpen && afterOpen && beforeClose) {
            this.setMarketOpen(true);
            
            // Ping opt in role.
            CHANNELS._send('STOCKS_VC_TEXT', `${ROLES._textRef('MARKET_OPEN_PING')}, NYSE market open - good luck!`, {});

            console.log("Market open detected");

            // CHANNELS._send('STOCKS_VC_TEXT', "Setting stock market open");

            // Give them 15 seconds to join before announcing after ping so they can catch it.
            setTimeout(() => {
                this.announce();
            }, 15000);
        }
    }

    static async announce() {
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });
        
        const channel = CHANNELS._getCode('STOCKS_VC');

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            debug: true
        });
    
        await entersState(connection, VoiceConnectionStatus.Ready, 30e3);

        connection.subscribe(player);

        const url = 'https://www.thecoop.group/marketopen.mp3';

        // const resource = createAudioResource(url, {
        //     inputType: StreamType.Arbitrary
        // });

        player.play(createAudioResource(url));
    
        entersState(player, AudioPlayerStatus.Playing, 5e3);
    }
}