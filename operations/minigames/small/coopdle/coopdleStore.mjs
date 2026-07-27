import Database from "coop-shared/setup/database.mjs";
import DatabaseHelper from "coop-shared/helper/databaseHelper.mjs";

import { decodeScore, encodeScore } from "./game.mjs";

export const STATUSES = {
    PLAYING: 'PLAYING',
    WON: 'WON',
    LOST: 'LOST',
    EXPIRED: 'EXPIRED'
};

const nowSecs = () => Math.round(Date.now() / 1000);

/**
 * Database access for Coopdle. The board is rebuilt from these rows on every
 * interaction, so an in-progress game survives Cooper restarting.
 *
 * Guesses are working state: they are deleted when the game ends. The finished
 * game row and the per-player totals in coopdle_stats are what stay behind.
 */
export default class CoopdleStore {

    // ------------------------------------------------------------------ games

    static async create(answer, maxGuesses) {
        const result = await Database.query({
            name: "create-coopdle",
            text: `INSERT INTO coopdle_games(answer, max_guesses, status, started_at)
                VALUES(?, ?, ?, ?)`,
            values: [answer, maxGuesses, STATUSES.PLAYING, nowSecs()]
        });
        return result.insertId;
    };

    static async setLink(id, link) {
        return await Database.query({
            name: "set-coopdle-link",
            text: `UPDATE coopdle_games SET message_link = ? WHERE id = ?`,
            values: [link, id]
        });
    };

    static async get(id) {
        return await DatabaseHelper.singleQuery({
            name: "get-coopdle",
            text: `SELECT * FROM coopdle_games WHERE id = ?`,
            values: [id]
        });
    };

    static async active() {
        return await DatabaseHelper.singleQuery({
            name: "get-active-coopdle",
            text: `SELECT * FROM coopdle_games WHERE status = ? ORDER BY id DESC LIMIT 1`,
            values: [STATUSES.PLAYING]
        });
    };

    // Games left unsolved and untouched for too long, for cleaning up.
    static async abandoned(maxAgeSecs) {
        return await DatabaseHelper.manyQuery({
            name: "get-abandoned-coopdles",
            text: `SELECT * FROM coopdle_games WHERE status = ? AND started_at <= ?`,
            values: [STATUSES.PLAYING, nowSecs() - maxAgeSecs]
        });
    };

    // The words the community has had lately, so a new board doesn't repeat one.
    static async recentAnswers(limit = 50) {
        const rows = await DatabaseHelper.manyQuery({
            name: "get-recent-coopdle-answers",
            text: `SELECT answer FROM coopdle_games ORDER BY id DESC LIMIT ?`,
            values: [limit]
        });

        return rows.map(row => row.answer);
    };

    static async finish(id, { status, solverID = null, guessesUsed = 0, playersNum = 0 }) {
        return await Database.query({
            name: "finish-coopdle",
            text: `UPDATE coopdle_games
                SET status = ?, solver_id = ?, guesses_used = ?, players_num = ?, ended_at = ?
                WHERE id = ? AND status = ?`,
            values: [status, solverID, guessesUsed, playersNum, nowSecs(), id, STATUSES.PLAYING]
        });
    };

    // ---------------------------------------------------------------- guesses

    static async guesses(gameID) {
        const rows = await DatabaseHelper.manyQuery({
            name: "get-coopdle-guesses",
            text: `SELECT * FROM coopdle_guesses WHERE game_id = ? ORDER BY guess_no ASC`,
            values: [gameID]
        });

        return rows.map(row => ({
            word: row.word,
            score: decodeScore(row.score),
            revealed: row.revealed,
            playerID: row.player_id,
            username: row.username,
            guessedAt: row.guessed_at
        }));
    };

    static async addGuess(gameID, guessNo, { word, score, revealed, playerID, username }) {
        return await Database.query({
            name: "add-coopdle-guess",
            text: `INSERT INTO coopdle_guesses(game_id, guess_no, player_id, username, word, score, revealed, guessed_at)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
            values: [gameID, guessNo, playerID, username, word, encodeScore(score), revealed, nowSecs()]
        });
    };

    // Called once a game ends: the board is history, the stats are already banked.
    static async clearGuesses(gameID) {
        return await Database.query({
            name: "delete-coopdle-guesses",
            text: `DELETE FROM coopdle_guesses WHERE game_id = ?`,
            values: [gameID]
        });
    };

    // ------------------------------------------------------------------ stats

    // Banked per guess so a game that never finishes still counts the effort.
    static async trackGuess(playerID, username, wasCorrect) {
        const correct = wasCorrect ? 1 : 0;
        const played = nowSecs();

        return await Database.query({
            name: "track-coopdle-guess",
            text: `INSERT INTO coopdle_stats(player_id, username, guesses, correct_guesses, last_played)
                VALUES(?, ?, 1, ?, ?)
                ON DUPLICATE KEY UPDATE
                    username = ?,
                    guesses = guesses + 1,
                    correct_guesses = correct_guesses + ?,
                    last_played = ?`,
            values: [playerID, username, correct, played, username, correct, played]
        });
    };

    static async trackGame(playerID, username, { won = false, solvedIn = null }) {
        const win = won ? 1 : 0;
        const loss = won ? 0 : 1;
        const solve = solvedIn ? 1 : 0;
        const played = nowSecs();

        return await Database.query({
            name: "track-coopdle-game",
            text: `INSERT INTO coopdle_stats(player_id, username, games, wins, losses, solves, best_solve, last_played)
                VALUES(?, ?, 1, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    username = ?,
                    games = games + 1,
                    wins = wins + ?,
                    losses = losses + ?,
                    solves = solves + ?,
                    best_solve = IF(? IS NULL, best_solve, LEAST(COALESCE(best_solve, ?), ?)),
                    last_played = ?`,
            values: [
                playerID, username, win, loss, solve, solvedIn, played,
                username, win, loss, solve, solvedIn, solvedIn, solvedIn, played
            ]
        });
    };

    static async playerStats(playerID) {
        return await DatabaseHelper.singleQuery({
            name: "get-coopdle-stats",
            text: `SELECT * FROM coopdle_stats WHERE player_id = ?`,
            values: [playerID]
        });
    };

    static async leaderboard(limit = 10) {
        return await DatabaseHelper.manyQuery({
            name: "get-coopdle-leaderboard",
            text: `SELECT * FROM coopdle_stats
                ORDER BY solves DESC, correct_guesses DESC, guesses ASC
                LIMIT ?`,
            values: [limit]
        });
    };

    /** Community totals: games played/solved and the guessing effort behind them. */
    static async totals() {
        const games = await DatabaseHelper.singleQuery({
            name: "get-coopdle-totals",
            text: `SELECT
                    COUNT(*) AS finished,
                    COALESCE(SUM(status = ?), 0) AS solved,
                    COALESCE(SUM(guesses_used), 0) AS guesses_used
                FROM coopdle_games WHERE status <> ?`,
            values: [STATUSES.WON, STATUSES.PLAYING]
        });

        const players = await DatabaseHelper.singleQuery({
            name: "get-coopdle-player-totals",
            text: `SELECT
                    COUNT(*) AS players,
                    COALESCE(SUM(guesses), 0) AS guesses,
                    COALESCE(SUM(correct_guesses), 0) AS correct_guesses
                FROM coopdle_stats`
        });

        return {
            finished: Number(games?.finished || 0),
            solved: Number(games?.solved || 0),
            guessesUsed: Number(games?.guesses_used || 0),
            players: Number(players?.players || 0),
            guesses: Number(players?.guesses || 0),
            correctGuesses: Number(players?.correct_guesses || 0)
        };
    };

};
