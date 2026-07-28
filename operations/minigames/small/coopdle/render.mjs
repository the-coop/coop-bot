import { WORD_LENGTH } from './words.mjs';
import { CORRECT, PRESENT, ABSENT, WON, LOST } from './game.mjs';

const TILE = 62;
const TILE_GAP = 5;
const PAD = 24;
const HEADER_H = 36;
const STATUS_H = 40;
const NAME_GAP = 18;
const NAME_W = 200;

// Everything that isn't a guess tile is red/orange.
const THEMES = {
    light: {
        bg: '#fff7ed',
        text: '#7c2d12',
        subtext: '#c2410c',
        tileEmpty: '#fffbf5',
        tileEmptyBorder: '#fdba74'
    },
    dark: {
        bg: '#1c0f0a',
        text: '#fdba74',
        subtext: '#fb923c',
        tileEmpty: '#241310',
        tileEmptyBorder: '#7c2d12'
    }
};

// Guess feedback keeps the conventional green / yellow / grey.
const STATE_COLORS = {
    light: {
        [CORRECT]: '#6aaa64',
        [PRESENT]: '#c9b458',
        [ABSENT]: '#787c7e'
    },
    dark: {
        [CORRECT]: '#538d4e',
        [PRESENT]: '#b59f3b',
        [ABSENT]: '#3a3a3c'
    }
};

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const BOARD_W = WORD_LENGTH * TILE + (WORD_LENGTH - 1) * TILE_GAP;

// The name column is reserved even before anyone has guessed, so the image does
// not change size as the board fills up.
const WIDTH = PAD + BOARD_W + NAME_GAP + NAME_W + PAD;

// Canvas is a native module, loaded on first draw rather than at boot so it
// can only ever take Coopdle down with it, never the whole bot.
let canvasLoading = null;

const loadCanvas = () => (canvasLoading = canvasLoading || import('@napi-rs/canvas'));

const centeredText = (ctx, text, cx, cy) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
};

const truncate = (ctx, text, maxWidth) => {
    if (ctx.measureText(text).width <= maxWidth) return text;

    let shortened = text;
    while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth)
        shortened = shortened.slice(0, -1);

    return `${shortened}…`;
};

export const statusText = game => {
    if (game.status === WON) return `Solved in ${game.guesses.length}/${game.maxGuesses}`;
    if (game.status === LOST) return `The word was ${game.answer.toUpperCase()}`;
    return `Guess ${game.guesses.length + 1} of ${game.maxGuesses}, anyone can play`;
};

/**
 * Draws the shared guess grid, each row credited to whoever played it, and a
 * status line. The grid is sized from the game's guess allowance, so a longer
 * game just makes a taller image.
 *
 * @param {import('./game.mjs').Game} game
 * @param {{theme?: 'light'|'dark', message?: string}} options
 * @returns {Promise<Buffer>} PNG bytes.
 */
export async function renderBoard(game, { theme = 'dark', message = '' } = {}) {
    const canvas = await loadCanvas();

    const t = THEMES[theme] ?? THEMES.dark;
    const stateColors = STATE_COLORS[theme] ?? STATE_COLORS.dark;

    const rows = game.maxGuesses;
    const boardH = rows * TILE + (rows - 1) * TILE_GAP;
    const height = PAD + HEADER_H + boardH + STATUS_H + PAD;

    const image = canvas.createCanvas(WIDTH, height);
    const ctx = image.getContext('2d');

    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, WIDTH, height);

    ctx.fillStyle = t.text;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('COOPDLE', PAD, PAD + HEADER_H / 2 - 4);

    for (let row = 0; row < rows; row++) {
        const guess = game.guesses[row];
        const y = PAD + HEADER_H + row * (TILE + TILE_GAP);

        for (let col = 0; col < WORD_LENGTH; col++) {
            const x = PAD + col * (TILE + TILE_GAP);

            if (guess) {
                ctx.fillStyle = stateColors[guess.score[col]];
                ctx.fillRect(x, y, TILE, TILE);
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold 33px ${FONT}`;
                centeredText(ctx, guess.word[col].toUpperCase(), x + TILE / 2, y + TILE / 2 + 2);

            } else {
                ctx.fillStyle = t.tileEmpty;
                ctx.fillRect(x, y, TILE, TILE);
                ctx.strokeStyle = t.tileEmptyBorder;
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
            }
        }

        // Credit the guesser beside their row: the point of a shared board.
        if (guess?.username) {
            ctx.fillStyle = t.subtext;
            ctx.font = `17px ${FONT}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                truncate(ctx, guess.username, NAME_W),
                PAD + BOARD_W + NAME_GAP,
                y + TILE / 2
            );
        }
    }

    const status = message || statusText(game);

    ctx.fillStyle = game.isOver && !message ? t.text : t.subtext;
    ctx.font = `${game.isOver && !message ? 'bold ' : ''}18px ${FONT}`;
    centeredText(ctx, status, PAD + BOARD_W / 2, PAD + HEADER_H + boardH + STATUS_H / 2);

    return image.toBuffer('image/png');
}
