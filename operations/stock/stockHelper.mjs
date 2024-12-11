import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import moment from 'moment';
import { CHANNELS, ROLES } from '../../coop.mjs';
import Chicken from "../chicken.mjs";


export default class StockHelper {

    // This is only active from next election interval moment to a week after that
    static async isMarketOpen() {
        return await Chicken.getConfigVal('market_open') === 'true';
    }

    static setMarketOpen(state) {
        return Chicken.setConfig('market_open', state);
    }

    static async isPowerHour() {
        return await Chicken.getConfigVal('market_power_hour') === 'true';
    }

    static setPowerHour(state) {
        return Chicken.setConfig('market_power_hour', state);
    }

    static async getEST() {
        try {
            // const { data } = await axios.get('https://worldtimeapi.org/api/timezone/EST');

            
            let date =  moment().tz('America/New_York');
            
            // if (data.dst === 'true')
            //     date.add(data.dst_offset, 'h');

            // console.log(date);

            // For some reason it's an hour slow on the API.
            // date.add(1, 'h');

            return date;
        } catch(e) {
            return null;
        }
    }

    static async update() {
        const date = await this.getEST();

        // Martin Luther King Jr. Day 2023 in United States 16th Jan
        // July 4th - Independence day
        // Jan 1st - New Years Day
        // Presidents day
        // June teenth - June 11th & 12th
        // Christmas day - 25th December

        // If the date cannot be calculated or requested don't bother.
        if (!date) return;

        // Check if weekday.
        const isESTWeekday = ![0, 6].includes(date.day());

        // NYSE open Monday-Friday, 9:30 a.m. to 4:00 p.m. EST.
        const afterOpen = (date.hours() === 9 && date.minutes() >= 30) || date.hours() >= 10;

        // Check the hour has not yet reached 4pm EST.
        const beforeClose = date.hours() < 16;

        // Check persisted state [Script awareness of openness].
        const currentlyOpen = await this.isMarketOpen();
        const isPowerHourRunning = await this.isPowerHour();

        // This may be problematic at the end/start of the week???
        if (!isESTWeekday) 
            return false;

        // Intercept market closing and handle it.
        if (currentlyOpen && !beforeClose) {
            this.setMarketOpen(false);
            this.setPowerHour(false);

            CHANNELS._send('STOCKS_VC_TEXT', "https://cdn.discordapp.com/attachments/748649755965522031/1136026746450350200/market-closed.png");
            CHANNELS._send('STOCKS_VC_TEXT', "Stock market closed");
        }

        // Detect and handle market closing.
        if (!currentlyOpen && afterOpen && beforeClose) {
            console.log("Market open detected");
            this.setMarketOpen(true);
            
            // Ping opt in role.

            await CHANNELS._send('STOCKS_VC_TEXT', 'https://cdn.discordapp.com/attachments/748649755965522031/1136451537376399440/market-open.png');
            const msg = await CHANNELS._send('STOCKS_VC_TEXT', `${ROLES._textRef('MARKET_OPEN_PING')}, NYSE market open - good luck!`, {});
            msg.edit({ components: [
                new ActionRowBuilder()
                    .addComponents([
                        new ButtonBuilder()
                            .setLabel("Ridahk's Take!")
                            .setURL('https://discord.com/channels/723660447508725802/1020871428934992013')
                            .setStyle(ButtonStyle.Link)
                    ])
            ] });

            // Give them 15 seconds to join before announcing after ping so they can catch it.
            // Update: Don't wait for them, be fast.
        }
        
        // Check if power hour needs starting (stopped when market closes).
        const isPowerHourTime = date.hours() >= 15;
        if (currentlyOpen && isPowerHourTime && !isPowerHourRunning) {
            CHANNELS._send('STOCKS_VC_TEXT', "https://cdn.discordapp.com/attachments/748649755965522031/1136026402211250227/power-hour.png");
            this.setPowerHour(true);
        }
    }


}
