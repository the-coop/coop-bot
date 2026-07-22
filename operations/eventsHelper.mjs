import db from "coop-shared/helper/databaseHelper.mjs";
import STATE from "../state.mjs";

export const numberEnding = number => (number > 1) ? 's' : '';

export default class EventsHelper {

    static async read(eventCode) {
        const query = {
            name: "get-event",
            text: "SELECT * FROM events WHERE event_code = ?",
            values: [eventCode]
        };
        const response = await db._sq(query);
        return response;
    };

    static async setLink(code, link) {
        return await db.singleQuery({
            name: "set-event-message",
            text: 'UPDATE events SET message_link = ? WHERE event_code = ?',
            values: [link, code]
        });
    };

    static async setActive(code, active) {
        // MySQL has no RETURNING: apply the update, then read the value back.
        await db._sq({
            name: "set-event-status",
            text: 'UPDATE events SET active = ? WHERE event_code = ?',
            values: [!!active, code]
        });
        return (await this.read(code))?.active;
    };

    static async setOrganiser(code, organiser) {
        return await db._sq({
            name: "set-event-organiser",
            text: 'UPDATE events SET organiser = ? WHERE event_code = ?',
            values: [organiser, code]
        });
    };

    static async create(eventCode) {
        const query = {
            name: "create-recurring-event",
            text: "INSERT INTO events (event_code, last_occurred) VALUES (?, ?)",
            values: [eventCode, Date.now()]
        };
        return await db._sq(query);
    };
    
    static async update(eventCode, time) {
        // MySQL has no RETURNING: apply the update, then read the row back.
        await db._sq({
            name: "update-event",
            text: 'UPDATE events SET last_occurred = ? WHERE event_code = ?',
            values: [time, eventCode]
        });
        return await this.read(eventCode);
    };

    static msToReadableHours(ms) {
        let temp = Math.floor(ms / 1000);
        let hours = Math.floor((temp %= 86400) / 3600);
        if (hours) return hours + ' hour' + numberEnding(hours);
        return 'now';
    };

    static msToReadable(milliseconds) {   
        let temp = Math.floor(milliseconds / 1000);

        let years = Math.floor(temp / 31536000);
        if (years) return years + ' year' + numberEnding(years);

        let days = Math.floor((temp %= 31536000) / 86400);
        if (days) return days + ' day' + numberEnding(days);

        let hours = Math.floor((temp %= 86400) / 3600);
        if (hours) return hours + ' hour' + numberEnding(hours);

        let minutes = Math.floor((temp %= 3600) / 60);
        if (minutes) return minutes + ' minute' + numberEnding(minutes);

        let seconds = temp % 60;
        if (seconds) return seconds + ' second' + numberEnding(seconds);
        
        return 'less than a second';
    };

    static chanceRun(command, likelihood) {
        if (STATE.CHANCE.bool({ likelihood })) command();
    };

    static runInterval(command, interval) {
        return setInterval(command, interval);
    };

    static chanceRunInterval(command, likelihood, interval) {
        return setInterval(() => {
            this.chanceRun(command, likelihood);
        }, interval);
    };

};