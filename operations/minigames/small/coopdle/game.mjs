import { WORD_LENGTH, isValidGuess } from './words.mjs';

/** Standard Wordle allows 6; the extra room makes harder answers fair on a shared board. */
export const DEFAULT_MAX_GUESSES = 8;

export const CORRECT = 'correct';
export const PRESENT = 'present';
export const ABSENT = 'absent';

export const PLAYING = 'playing';
export const WON = 'won';
export const LOST = 'lost';

// Single character per tile, so a whole guess fits a CHAR(5) column.
const SCORE_CHARS = { [CORRECT]: 'C', [PRESENT]: 'P', [ABSENT]: 'A' };
const SCORE_STATES = { C: CORRECT, P: PRESENT, A: ABSENT };

export const encodeScore = score => score.map(state => SCORE_CHARS[state]).join('');

export const decodeScore = encoded => String(encoded).split('').map(char => SCORE_STATES[char] || ABSENT);

export const SHARE_EMOJIS = { [CORRECT]: '🟩', [PRESENT]: '🟨', [ABSENT]: '⬜' };

/**
 * Wordle scoring. Exact matches are claimed first so that a repeated letter
 * only shows yellow as many times as it actually remains in the answer:
 * guessing "geese" against "beget" gives green-yellow-absent-absent-absent.
 */
export function scoreGuess(guess, answer) {
    const result = new Array(WORD_LENGTH).fill(ABSENT);
    const remaining = new Map();

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === answer[i]) result[i] = CORRECT;
        else remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1);
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (result[i] === CORRECT) continue;
        const left = remaining.get(guess[i]) ?? 0;
        if (left > 0) {
            result[i] = PRESENT;
            remaining.set(guess[i], left - 1);
        }
    }

    return result;
}

// A letter greyed out in a guess that also scores it green/yellow elsewhere is
// only a surplus copy: the letter itself is still in the answer.
const scoringLetters = (word, score) =>
    new Set(word.split('').filter((letter, i) => score[i] !== ABSENT));

/** What the board collectively knows: green positions, letters in, letters out. */
export function knowledgeFrom(guesses) {
    const knowledge = { greens: new Set(), present: new Set(), absent: new Set() };

    guesses.forEach(({ word, score }) => {
        const scored = scoringLetters(word, score);
        score.forEach((state, i) => {
            const letter = word[i];
            if (state === CORRECT) {
                knowledge.greens.add(i);
                knowledge.present.add(letter);
            } else if (state === PRESENT) knowledge.present.add(letter);
            else if (!scored.has(letter)) knowledge.absent.add(letter);
        });
    });

    return knowledge;
}

/**
 * How much a guess adds to what the board already knew, split by the kind of
 * tile that did it: a newly pinned position (green), a letter newly known to be
 * in the word (yellow), or a letter newly ruled out. Eliminating letters is real
 * progress in Wordle, so it counts towards the total. All zeroes means the guess
 * told the community nothing it hadn't already been told.
 *
 * @returns {{greens: number, yellows: number, ruledOut: number, total: number}}
 */
export function countDiscoveries(priorGuesses, word, score) {
    const knowledge = knowledgeFrom(priorGuesses);
    const scored = scoringLetters(word, score);
    const counted = new Set();

    const discovery = { greens: 0, yellows: 0, ruledOut: 0, total: 0 };

    score.forEach((state, i) => {
        const letter = word[i];

        if (state === CORRECT) {
            if (!knowledge.greens.has(i)) discovery.greens++;

        } else if (state === PRESENT) {
            if (!knowledge.present.has(letter) && !counted.has(letter)) {
                counted.add(letter);
                discovery.yellows++;
            }

        } else if (!scored.has(letter) && !knowledge.absent.has(letter) && !counted.has(letter)) {
            counted.add(letter);
            discovery.ruledOut++;
        }
    });

    discovery.total = discovery.greens + discovery.yellows + discovery.ruledOut;

    return discovery;
}

export class Game {

    /**
     * @param {string} answer
     * @param {number} maxGuesses
     * @param {{word: string, score: string[], playerID?: string, username?: string}[]} guesses
     *   Prior guesses, oldest first - the board is rebuilt from the database on
     *   every interaction so it survives Cooper restarting mid-game.
     */
    constructor(answer, maxGuesses = DEFAULT_MAX_GUESSES, guesses = []) {
        this.answer = answer;
        this.maxGuesses = maxGuesses;

        // Rewards are paid per tile a guess was the first to uncover, so each
        // guess carries its own breakdown. It is replayed rather than read back
        // because a board rebuilt from the database only stores words and scores.
        this.guesses = [];
        guesses.forEach(guess => this.guesses.push({ ...guess, ...this.discover(guess.word, guess.score) }));
    }

    /** What a guess adds to the board as it stands right now. */
    discover(word, score) {
        const discovery = countDiscoveries(this.guesses, word, score);
        return { ...discovery, revealed: discovery.total };
    }

    get status() {
        const last = this.guesses[this.guesses.length - 1];
        if (last && last.word === this.answer) return WON;
        if (this.guesses.length >= this.maxGuesses) return LOST;
        return PLAYING;
    }

    get isOver() {
        return this.status !== PLAYING;
    }

    get remaining() {
        return Math.max(0, this.maxGuesses - this.guesses.length);
    }

    has(word) {
        return this.guesses.some(guess => guess.word === word);
    }

    /**
     * @returns {{ok: true, word: string, score: string[], greens: number, yellows: number,
     *   ruledOut: number, revealed: number} | {ok: false, reason: string}}
     */
    submit(input, meta = {}) {
        if (this.isOver) return { ok: false, reason: 'That Coopdle is already over.' };

        const word = String(input).trim().toLowerCase();
        if (word.length !== WORD_LENGTH)
            return { ok: false, reason: `"${word}" is ${word.length} letters, guesses must be ${WORD_LENGTH}.` };

        if (!/^[a-z]+$/.test(word)) return { ok: false, reason: 'Letters A-Z only.' };
        if (!isValidGuess(word)) return { ok: false, reason: `"${word}" is not in the dictionary.` };
        if (this.has(word)) return { ok: false, reason: `"${word}" has already been guessed.` };

        // The board's guesses are shared, so nobody gets to spend one on letters
        // the community has already proved aren't in the word.
        const ruledOut = new Set(this.eliminated());
        const dead = [...new Set(word)].filter(letter => ruledOut.has(letter));
        if (dead.length) return {
            ok: false,
            reason: `"${word.toUpperCase()}" uses ruled out letter${dead.length > 1 ? 's' : ''} ` +
                `${dead.map(letter => letter.toUpperCase()).join(' ')}.`
        };

        const score = scoreGuess(word, this.answer);
        const discovery = this.discover(word, score);

        this.guesses.push({ word, score, ...discovery, ...meta });

        return { ok: true, word, score, ...discovery };
    }

    /** Letters pinned to a position, "_ra_e", used to prompt the next guesser. */
    hint() {
        const letters = new Array(WORD_LENGTH).fill('_');
        this.guesses.forEach(({ word, score }) =>
            score.forEach((state, i) => {
                if (state === CORRECT) letters[i] = word[i];
            })
        );
        return letters.join('');
    }

    /** Letters the board has ruled out, and which guesses may no longer use. */
    eliminated() {
        return [...knowledgeFrom(this.guesses).absent].sort();
    }

    /** Emoji grid, the shareable Wordle summary. */
    share(label = 'Coopdle') {
        const status = this.status;
        const used = status === WON ? this.guesses.length : status === LOST ? 'X' : '?';
        const grid = this.guesses
            .map(({ score }) => score.map(state => SHARE_EMOJIS[state]).join(''))
            .join('\n');

        return `${label} ${used}/${this.maxGuesses}\n${grid}`;
    }

}
