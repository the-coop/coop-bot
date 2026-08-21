import {
    ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle
} from "discord.js";

import Items from "coop-shared/services/items.mjs";

import { CHANNELS, CHICKEN, INTERACTION, MESSAGES, ROLES, STATE, TIME, USERS } from "../../../coop.mjs";

import DropTable from "../medium/economy/items/droptable.mjs";
import TemporaryMessages from "../../activity/maintenance/temporaryMessages.mjs";

import CoopdleStore, { STATUSES } from "./coopdle/coopdleStore.mjs";
import { Game, DEFAULT_MAX_GUESSES, SHARE_EMOJIS, WON } from "./coopdle/game.mjs";
import { renderBoard } from "./coopdle/render.mjs";
import { WORD_LENGTH, answerCount, wordAt, ready as dictionaryReady } from "./coopdle/words.mjs";

// Interaction ids carry the game they belong to: coopdle_guess_12.
const GUESS_BUTTON = 'coopdle_guess';
const GUESS_MODAL = 'coopdle_word';

const nowSecs = () => Math.round(Date.now() / 1000);

/**
 * Coopdle: one Wordle board shared by the whole community. Cooper drops a board,
 * anybody can spend one of its guesses, and when it falls everyone who helped
 * gets paid - the solver most of all.
 */
export default class CoopdleMinigame {

    static MAX_GUESSES = DEFAULT_MAX_GUESSES;

    // One board per coop day, dropped a random while after the day rolls over so
    // it doesn't always land at the same point in the announcements.
    static DELAY_SECS = { min: 20 * 60, max: 120 * 60 };

    // Chicken config keys tracking which coop day the board belongs to and when
    // it is due, so a restart doesn't lose or repeat a day's board.
    static DAY_KEY = 'coopdle_day';
    static DUE_KEY = 'coopdle_due';

    // A board nobody finishes is cleaned up after this long, well before the
    // next coop day brings another one.
    static LIFETIME_SECS = 60 * 60 * 20;

    // Stops one person burning the shared guesses back to back.
    static TURN_COOLDOWN_SECS = 20;

    // How many previous answers a fresh board avoids repeating.
    static RECENT_ANSWERS = 50;

    // Paid per tile a player was the first to uncover, so points follow the work
    // done on the board rather than the number of turns taken: pinning a letter
    // to its position is worth more than proving it is in the word somewhere.
    static REWARDS = {
        perGreen: 3,
        perYellow: 1,

        // Landing the final word is a small kicker on top of the tiles it scored,
        // not the payday - the guesses that set it up are worth more.
        solver: 3,

        // Spending a shared guess is worth something even when it uncovers nothing.
        participation: 1,

        contributorDropPerc: 33
    };

    // Guesses are applied one at a time per board, so two people submitting
    // together can't claim the same turn or race the board render.
    static queues = {};

    static queue(gameID, task) {
        const previous = this.queues[gameID] || Promise.resolve();
        const next = previous.then(task, task);

        // Keep the tail of the chain, dropping it once the board goes quiet.
        const settled = next.catch(() => {}).then(() => {
            if (this.queues[gameID] === settled) delete this.queues[gameID];
        });
        this.queues[gameID] = settled;

        return next;
    };

    // coopdle_guess_12 -> 12, or null when the id isn't one of ours.
    static parseGameID(customId, prefix) {
        const gameID = parseInt(customId.slice(prefix.length + 1), 10);
        return Number.isInteger(gameID) ? gameID : null;
    };

    // Interaction interceptor to check if user is attempting to interact.
    static async onInteraction(interaction) {
        try {
            const id = interaction.customId;
            if (!id || !id.startsWith('coopdle_')) return false;

            // Cooper's own components/interactions are never plays.
            if (USERS.isCooper(interaction.user.id)) return false;

            if (interaction.isButton() && id.startsWith(GUESS_BUTTON)) {
                const gameID = this.parseGameID(id, GUESS_BUTTON);
                if (!gameID) return false;

                return await this.prompt(interaction, gameID);
            }

            if (interaction.isModalSubmit() && id.startsWith(GUESS_MODAL)) {
                const gameID = this.parseGameID(id, GUESS_MODAL);
                if (!gameID) return false;

                const word = interaction.fields.getTextInputValue('word');
                return await this.queue(gameID, () => this.guess(interaction, gameID, word));
            }

            return false;

        } catch (e) {
            console.error(e);
            console.log('Above error related to coopdle interaction handler');
            return false;
        }
    };

    /**
     * What the board knows, in the guess box itself: the pinned letters, and the
     * letters a guess is no longer allowed to spend a shared turn on.
     */
    static placeholder(game) {
        const hint = game.hint();
        const known = hint === '_'.repeat(WORD_LENGTH)
            ? `Any ${WORD_LENGTH} letter word`
            : `Known: ${hint.toUpperCase()}`;

        const ruledOut = game.eliminated();
        if (!ruledOut.length) return known;

        return `${known} · no ${ruledOut.map(letter => letter.toUpperCase()).join('')}`;
    };

    // Open the guess box, prefilled with whatever the board has pinned down.
    static async prompt(interaction, gameID) {
        const gameRow = await CoopdleStore.get(gameID);

        if (!gameRow || gameRow.status !== STATUSES.PLAYING)
            return await INTERACTION.reply(interaction, 'That Coopdle has already finished.');

        const game = await this.load(gameRow);

        const input = new TextInputBuilder()
            .setCustomId('word')
            .setLabel(`Guess ${game.guesses.length + 1} of ${game.maxGuesses}`)
            .setStyle(TextInputStyle.Short)
            .setMinLength(WORD_LENGTH)
            .setMaxLength(WORD_LENGTH)
            .setPlaceholder(this.placeholder(game))
            .setRequired(true);

        const modal = new ModalBuilder()
            .setCustomId(`${GUESS_MODAL}_${gameID}`)
            .setTitle('Coopdle')
            .addComponents(new ActionRowBuilder().addComponents(input));

        return await interaction.showModal(modal);
    };

    // Spend one of the board's shared guesses.
    static async guess(interaction, gameID, word) {
        try {
            const { user } = interaction;

            const gameRow = await CoopdleStore.get(gameID);
            if (!gameRow || gameRow.status !== STATUSES.PLAYING)
                return await INTERACTION.reply(interaction, 'That Coopdle has already finished.');

            const game = await this.load(gameRow);

            // Let somebody else have a turn before guessing twice in a row.
            const last = game.guesses[game.guesses.length - 1];
            if (last && last.playerID === user.id) {
                const waitSecs = this.TURN_COOLDOWN_SECS - (nowSecs() - last.guessedAt);
                if (waitSecs > 0) return await INTERACTION.reply(
                    interaction,
                    `You guessed last, give someone else a go (${waitSecs}s).`
                );
            }

            const result = game.submit(word, { playerID: user.id, username: user.username, guessedAt: nowSecs() });
            if (!result.ok) return await INTERACTION.reply(interaction, result.reason);

            // Record the turn and bank the guesser's stats immediately, so
            // effort still counts if the board is never finished.
            await CoopdleStore.addGuess(gameID, game.guesses.length, {
                ...result,
                playerID: user.id,
                username: user.username
            });
            await CoopdleStore.trackGuess(user.id, user.username, result.revealed > 0);

            // Acknowledge the guesser before the slower board work, naming the
            // tiles they uncovered because that is what they will be paid on.
            const tiles = result.score.map(state => SHARE_EMOJIS[state]).join('');
            const found = [
                result.greens ? `${result.greens}🟩` : null,
                result.yellows ? `${result.yellows}🟨` : null
            ].filter(Boolean).join(' ');
            const contribution = game.status === WON
                ? 'you solved it for the whole community!'
                : found
                    ? `${found} new for the community.`
                    : result.revealed > 0
                        ? 'no new letters, but you ruled some out for the community.'
                        : 'nothing new for the board, but it still counts as a guess.';
            await INTERACTION.reply(interaction, `${tiles} ${result.word.toUpperCase()} - ${contribution}`);

            const boardMsg = await this.boardMessage(interaction, gameRow);

            if (game.isOver) return await this.conclude(game, gameRow, boardMsg);

            return await this.draw(boardMsg, game, gameID);

        } catch (e) {
            console.error(e);
            console.log('Above error related to coopdle guess');

            // The interaction still needs an answer of some kind.
            try {
                if (!interaction.replied) await INTERACTION.reply(interaction, 'Your guess could not be counted.');
            } catch (replyError) {
                // Interaction expired, nothing more to say.
            }
        }
    };

    // Rebuild the shared board from the database.
    static async load(gameRow) {
        await dictionaryReady();

        const guesses = await CoopdleStore.guesses(gameRow.id);
        return new Game(gameRow.answer, gameRow.max_guesses, guesses);
    };

    static async boardMessage(interaction, gameRow) {
        if (interaction.message) return interaction.message;
        if (gameRow.message_link) return await MESSAGES.getByLink(gameRow.message_link);
        return null;
    };

    static guessButton(gameID) {
        return new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setEmoji('🧩')
                .setLabel('Guess')
                .setCustomId(`${GUESS_BUTTON}_${gameID}`)
                .setStyle(ButtonStyle.Primary)
        ]);
    };

    static header(game) {
        const lines = [
            `🧩 **COOPDLE IN PROGRESS** 🧩 one shared board, ` +
            `${game.remaining} guess${game.remaining === 1 ? '' : 'es'} left. Anyone can play.`
        ];

        const ruledOut = game.eliminated();
        if (ruledOut.length) lines.push(`Ruled out: ${ruledOut.map(letter => letter.toUpperCase()).join(' ')}`);

        return lines.join('\n');
    };

    /** Avatar URLs for everyone on the board, so rows show faces and not just names. */
    static async avatars(game) {
        const playerIDs = [...new Set(game.guesses.map(guess => guess.playerID).filter(Boolean))];

        const entries = await Promise.all(playerIDs.map(async playerID => {
            // Anyone who has left the server simply falls back to their initial.
            const member = USERS._get(playerID) || await USERS._fetch(playerID);
            return [playerID, member?.displayAvatarURL({ extension: 'png', forceStatic: true, size: 64 })];
        }));

        return Object.fromEntries(entries.filter(([, url]) => url));
    };

    // Build the message payload for a board state.
    static async payload(game, gameID, { message = '', closed = false } = {}) {
        const buffer = await renderBoard(game, { avatars: await this.avatars(game) });

        return {
            // A closed board carries its outcome as text: the image is just the grid.
            content: closed ? message : this.header(game),
            files: [new AttachmentBuilder(buffer, { name: 'coopdle.png' })],
            components: closed ? [] : [this.guessButton(gameID)]
        };
    };

    static async draw(msg, game, gameID, opts = {}) {
        if (!msg) return false;
        return await msg.edit(await this.payload(game, gameID, opts));
    };

    /**
     * Who played this board and how much of it they actually cracked open: the
     * green and yellow tiles are counted per player because those are what the
     * rewards are paid on.
     */
    static contributors(game) {
        const players = new Map();

        game.guesses.forEach(({ playerID, username, revealed, greens, yellows }) => {
            if (!playerID) return;

            const player = players.get(playerID) || { username, guesses: 0, correct: 0, greens: 0, yellows: 0 };
            player.username = username || player.username;
            player.guesses++;
            if (revealed > 0) player.correct++;
            player.greens += greens;
            player.yellows += yellows;

            players.set(playerID, player);
        });

        return players;
    };

    // Close the board, pay the contributors and clear the working guesses.
    static async conclude(game, gameRow, boardMsg) {
        const solved = game.status === WON;
        const solverID = solved ? game.guesses[game.guesses.length - 1].playerID : null;
        const players = this.contributors(game);

        // First writer wins: the update only applies while the game is playing,
        // so nobody can be rewarded twice for the same board.
        const finished = await CoopdleStore.finish(gameRow.id, {
            status: solved ? STATUSES.WON : STATUSES.LOST,
            solverID,
            guessesUsed: game.guesses.length,
            playersNum: players.size
        });
        if (!finished.rowCount) return false;

        // Bank the per-game totals, then drop the working guesses.
        await Promise.all([...players].map(([playerID, player]) =>
            CoopdleStore.trackGame(playerID, player.username, {
                won: solved,
                solvedIn: solved && playerID === solverID ? game.guesses.length : null
            })
        ));
        await CoopdleStore.clearGuesses(gameRow.id);

        const rewardsText = solved ? await this.reward(game, players, solverID) : '';

        // Reveal the finished board without its guess button.
        await this.draw(boardMsg, game, gameRow.id, { closed: true });

        const answer = `**${game.answer.toUpperCase()}**`;
        const solver = players.get(solverID)?.username || 'someone';
        const ping = ROLES._textRef('MINIGAME_PING');
        const outcomeText = solved
            ? `🟩 **COOPDLE SOLVED** 🟩 ${ping}, ${answer} in ${game.guesses.length}/${game.maxGuesses}, cracked by ${solver}!`
            : `🟥 **COOPDLE FAILED** 🟥 ${ping}, the word was ${answer}. No rewards this time.`;

        const resultText = `${outcomeText}\n\n${game.share()}\n${rewardsText}`;

        // The board message can be gone by now, the outcome still belongs in the channel.
        const resultChannel = boardMsg?.channel || CHANNELS._getCode('TALK');
        if (!resultChannel) return true;

        const resultMsg = await resultChannel.send(resultText);
        TemporaryMessages.add(resultMsg, 60 * 60);

        return true;
    };

    /**
     * Everyone who contributed a guess gets paid for the tiles they uncovered:
     * greens are worth the most, yellows still count, and whoever landed the
     * word takes a small bonus on top.
     */
    static async reward(game, players, solverID) {
        const unused = game.maxGuesses - game.guesses.length;
        const pointsEmoji = MESSAGES.emojiCodeText('COOP_POINT');

        // Solving with guesses to spare pays out of a better drop tier.
        const solverTier = unused >= 5 ? 'LEGENDARY' : unused >= 3 ? 'RARE' : 'AVERAGE';

        const lines = await Promise.all([...players].map(async ([playerID, player]) => {
            const isSolver = playerID === solverID;

            const points = this.REWARDS.participation
                + player.greens * this.REWARDS.perGreen
                + player.yellows * this.REWARDS.perYellow
                + (isSolver ? this.REWARDS.solver : 0);

            // Solvers always take an item, helpers might.
            const drop = isSolver
                ? DropTable.getRandomTieredWithQty(solverTier)
                : STATE.CHANCE.bool({ likelihood: this.REWARDS.contributorDropPerc })
                    ? DropTable.getRandomTieredWithQty('AVERAGE')
                    : null;

            try {
                await Items.add(playerID, 'COOP_POINT', points, 'Coopdle');
                if (drop) await Items.add(playerID, drop.item, drop.qty, 'Coopdle reward');

            } catch (e) {
                console.error(e);
                console.log('Above error related to coopdle rewards');
            }

            const dropText = drop ? ` ${MESSAGES.emojiCodeText(drop.item)}x${drop.qty}` : '';

            // Show what the points were paid on, so the scoring isn't a mystery.
            const tiles = [
                player.greens ? `${player.greens}🟩` : null,
                player.yellows ? `${player.yellows}🟨` : null,
                isSolver ? 'solve' : null
            ].filter(Boolean).join(' ');
            const forText = tiles ? ` (${tiles})` : '';

            return `${player.username} +${points}${pointsEmoji}${dropText}${forText}`;
        }));

        return lines.join('\n');
    };

    // Close down boards the community left hanging.
    static async expire() {
        const abandoned = await CoopdleStore.abandoned(this.LIFETIME_SECS);

        for (const gameRow of abandoned) {
            try {
                const game = await this.load(gameRow);
                const players = this.contributors(game);

                const finished = await CoopdleStore.finish(gameRow.id, {
                    status: STATUSES.EXPIRED,
                    guessesUsed: game.guesses.length,
                    playersNum: players.size
                });
                if (!finished.rowCount) continue;

                // An unsolved board still counts as a game played for whoever tried.
                await Promise.all([...players].map(([playerID, player]) =>
                    CoopdleStore.trackGame(playerID, player.username, { won: false })
                ));
                await CoopdleStore.clearGuesses(gameRow.id);

                const boardMsg = gameRow.message_link ? await MESSAGES.getByLink(gameRow.message_link) : null;
                await this.draw(boardMsg, game, gameRow.id, {
                    message: `Nobody solved it, the word was ${gameRow.answer.toUpperCase()}`,
                    closed: true
                });

                await this.announceExpiry(game, gameRow);

            } catch (e) {
                console.error(e);
                console.log('Above error related to expiring coopdle');
            }
        }
    };

    /**
     * A board quietly edited hours later is easy to miss, so the answer also goes
     * out to the channel where the minigame crowd will actually see it.
     */
    static async announceExpiry(game, gameRow) {
        const channel = CHANNELS._getCode('TALK');
        if (!channel) return false;

        const lines = [
            `🟥 **COOPDLE EXPIRED** 🟥 ${ROLES._textRef('MINIGAME_PING')}, nobody solved it - ` +
            `the word was **${gameRow.answer.toUpperCase()}**.`
        ];

        // Only worth showing the grid if the community actually got somewhere.
        if (game.guesses.length) lines.push('', game.share());
        if (gameRow.message_link) lines.push(gameRow.message_link);

        const expiryMsg = await channel.send(lines.join('\n'));
        TemporaryMessages.add(expiryMsg, 60 * 60);

        return true;
    };

    /**
     * Checked on a short interval: schedules a board when the coop day rolls
     * over (Chicken.checkIfNewDay moves current_day, which drifts rather than
     * landing at a fixed clock time) and drops it once it comes due.
     */
    static async tick() {
        try {
            // Close down anything the community left hanging from before.
            await this.expire();

            const currentDay = parseInt(await CHICKEN.getConfigVal('current_day'), 10);
            if (!currentDay) return false;

            const scheduledDay = parseInt(await CHICKEN.getConfigVal(this.DAY_KEY), 10) || 0;

            // A new coop day: roll when today's board should drop.
            if (scheduledDay !== currentDay) {
                const due = currentDay + STATE.CHANCE.natural(this.DELAY_SECS);

                await CHICKEN.setConfig(this.DAY_KEY, '' + currentDay);
                await CHICKEN.setConfig(this.DUE_KEY, '' + due);

                return false;
            }

            // Zero means today's board has already been dropped.
            const due = parseInt(await CHICKEN.getConfigVal(this.DUE_KEY), 10) || 0;
            if (!due || TIME._secs() < due) return false;

            // Clear the due time first: a slow drop can't be started twice.
            await CHICKEN.setConfig(this.DUE_KEY, '0');

            return await this.run();

        } catch (e) {
            console.error(e);
            console.log('Above error related to scheduling the daily coopdle');
            return false;
        }
    };

    /**
     * Today's word: a random offset into the five letter pool, re-rolled when it
     * lands on something the community has had recently.
     */
    static async pickAnswer() {
        await dictionaryReady();

        const recent = await CoopdleStore.recentAnswers(this.RECENT_ANSWERS);
        const roll = () => wordAt(STATE.CHANCE.natural({ min: 0, max: answerCount() - 1 }));

        let answer = roll();
        for (let attempt = 0; attempt < 10 && recent.includes(answer); attempt++) answer = roll();

        return answer;
    };

    // Drop a fresh board for the community to solve together.
    static async run() {
        try {
            // Clear out anything stale before checking for a live board.
            await this.expire();

            // One shared board at a time, so the community plays the same word.
            if (await CoopdleStore.active()) return false;

            const answer = await this.pickAnswer();
            const gameID = await CoopdleStore.create(answer, this.MAX_GUESSES);
            const game = new Game(answer, this.MAX_GUESSES, []);

            try {
                const channel = CHANNELS._getCode('TALK');
                const boardMsg = await channel.send(await this.payload(game, gameID));

                await CoopdleStore.setLink(gameID, MESSAGES.link(boardMsg));

                // Outlives the game itself so the solved board stays readable.
                TemporaryMessages.add(boardMsg, this.LIFETIME_SECS + 60 * 30);

                return true;

            } catch (e) {
                // Without a message there is nothing to play, don't block the next board.
                await CoopdleStore.finish(gameID, { status: STATUSES.EXPIRED });
                throw e;
            }

        } catch (e) {
            console.error(e);
            console.log('Above error occurred trying to start coopdle minigame');
            return false;
        }
    };

};
