import db from "coop-shared/helper/databaseHelper.mjs";
import { _fmt, _unfmt } from '../../channelHelper.mjs';
import { COMPETITION_ROLES } from '../competitionHelper.mjs';

export default class CompetitionModel {

    static setEntryMsg(entryID, messageID) {
        return db.singleQuery({
            text: 'UPDATE competition_entries SET entry_msg_id = $2 WHERE id = $1',
            values: [entryID, messageID]
        });
    };

    static clearEntrants(code) {
        return db.singleQuery({
            text: 'DELETE FROM competition_entries WHERE competition = $1',
            values: [code]
        });
    };

    static async unsetEntryByMessageID(messageID) {
        return db.singleQuery({
            text: 'UPDATE competition_entries SET entry_msg_id = NULL WHERE entry_msg_id = $1',
            values: [messageID]
        });
    };

    static getAll() {
        return db.manyQuery({
            name: "load-all-competition",
            text: `SELECT * FROM events WHERE event_code IN ($1, $2, $3)`,
            values: Object.keys(COMPETITION_ROLES).map(kc => kc.toLowerCase())
        });
    };

    static async get(code) {
        const competitions = await db.singleQuery({
            name: "load-competition",
            text: `SELECT * FROM events WHERE event_code = $1`,
            values: [code]
        });
        return competitions;
    };

    static async load() {
        const competitions = await db.manyQuery({
            name: "load-competitions",
            text: `SELECT * FROM events WHERE event_code 
                IN ('technology_competition', 'art_competition', 'money_competition')`,
            });
        return competitions;
    };

    static saveEntrant(code, user) {
        return db.singleQuery({
            name: 'add-competition-entrant',
            text: 'INSERT INTO competition_entries (entrant_id, competition) VALUES ($1, $2)',
            values: [user.id, code]
        });
    };

    static loadEntrant(code, user) {
        return db.singleQuery({
            name: 'load-competition-entrant',
            text: 'SELECT * FROM competition_entries WHERE entrant_id = $1 AND competition = $2',
            values: [user.id, code]
        });
    };

    static loadEntrants(code) {
        return db.manyQuery({
            name: 'load-competition-entrants',
            text: 'SELECT * FROM competition_entries WHERE competition = $1',
            values: [code]
        });
    };

    static async setTitle(code, title) {
        return await db.singleQuery({
            name: "set-competition-title",
            text: 'UPDATE events SET title = $2 WHERE event_code = $1',
            values: [code, title]
        });
    };

    static async setDescription(code, description) {
        return await db.singleQuery({
            name: "set-competition-description",
            text: 'UPDATE events SET description = $2 WHERE event_code = $1',
            values: [code, description]
        });
    };

    static async setLink(code, link) {
        return await db.singleQuery({
            name: "set-competition-message",
            text: 'UPDATE events SET message_link = $2 WHERE event_code = $1',
            values: [code, link]
        });
    };
    
};
