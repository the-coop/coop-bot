import { WORD_LENGTH } from './words.mjs';
import { CORRECT, PRESENT, ABSENT } from './game.mjs';

const TILE = 62;
const TILE_GAP = 5;
const PAD = 24;
const NAME_GAP = 18;
const AVATAR = 34;
const AVATAR_GAP = 10;
const NAME_W = 150;

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

// The player column is reserved even before anyone has guessed, so the image
// does not change size as the board fills up.
const WIDTH = PAD + BOARD_W + NAME_GAP + AVATAR + AVATAR_GAP + NAME_W + PAD;

// Canvas is a native module, loaded on first draw rather than at boot so it
// can only ever take Coopdle down with it, never the whole bot.
let canvasLoading = null;

const loadCanvas = () => (canvasLoading = canvasLoading || import('@napi-rs/canvas'));

// Avatars are re-drawn on every guess, so the decoded images are kept by URL.
// Discord puts the avatar hash in the URL, so a changed avatar is a new key.
const AVATAR_CACHE_MAX = 100;
const AVATAR_TIMEOUT_MS = 5000;

const avatarCache = new Map();

/** @returns {Promise<any|null>} The decoded avatar, or null to fall back to an initial. */
const loadAvatar = (canvas, url) => {
    const cached = avatarCache.get(url);
    if (cached) return cached;

    const pending = (async () => {
        const response = await fetch(url, { signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS) });
        if (!response.ok) throw new Error(`Avatar responded ${response.status}`);

        return await canvas.loadImage(Buffer.from(await response.arrayBuffer()));
    })().catch(() => null);

    if (avatarCache.size >= AVATAR_CACHE_MAX) avatarCache.delete(avatarCache.keys().next().value);
    avatarCache.set(url, pending);

    // A failed load isn't kept: the next board gets to try the avatar again.
    return pending.then(image => {
        if (!image) avatarCache.delete(url);
        return image;
    });
};

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

const circle = (ctx, x, y, size) => {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
};

/** The guesser's face beside their row, or their initial when there's no avatar. */
const drawAvatar = (ctx, theme, image, username, x, y) => {
    if (image) {
        ctx.save();
        circle(ctx, x, y, AVATAR);
        ctx.clip();
        ctx.drawImage(image, x, y, AVATAR, AVATAR);
        ctx.restore();
        return;
    }

    ctx.fillStyle = theme.tileEmpty;
    circle(ctx, x, y, AVATAR);
    ctx.fill();

    ctx.strokeStyle = theme.tileEmptyBorder;
    ctx.lineWidth = 2;
    circle(ctx, x + 1, y + 1, AVATAR - 2);
    ctx.stroke();

    ctx.fillStyle = theme.subtext;
    ctx.font = `bold 17px ${FONT}`;
    centeredText(ctx, (username || '?').charAt(0).toUpperCase(), x + AVATAR / 2, y + AVATAR / 2 + 1);
};

/**
 * Draws the shared guess grid, each row credited to whoever played it with
 * their avatar and name. The grid is sized from the game's guess allowance, so
 * a longer game just makes a taller image.
 *
 * @param {import('./game.mjs').Game} game
 * @param {{theme?: 'light'|'dark', avatars?: Record<string, string>}} options
 *   avatars maps player ID to avatar URL; anyone missing gets an initial.
 * @returns {Promise<Buffer>} PNG bytes.
 */
export async function renderBoard(game, { theme = 'dark', avatars = {} } = {}) {
    const canvas = await loadCanvas();

    const t = THEMES[theme] ?? THEMES.dark;
    const stateColors = STATE_COLORS[theme] ?? STATE_COLORS.dark;

    const rows = game.maxGuesses;
    const boardH = rows * TILE + (rows - 1) * TILE_GAP;
    const height = PAD + boardH + PAD;

    // Fetch every face up front: one round of requests rather than one per row.
    const urls = [...new Set(game.guesses.map(guess => avatars[guess.playerID]).filter(Boolean))];
    const images = new Map(await Promise.all(
        urls.map(async url => [url, await loadAvatar(canvas, url)])
    ));

    const image = canvas.createCanvas(WIDTH, height);
    const ctx = image.getContext('2d');

    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, WIDTH, height);

    for (let row = 0; row < rows; row++) {
        const guess = game.guesses[row];
        const y = PAD + row * (TILE + TILE_GAP);

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
        if (!guess?.username) continue;

        const avatarX = PAD + BOARD_W + NAME_GAP;
        drawAvatar(ctx, t, images.get(avatars[guess.playerID]), guess.username, avatarX, y + (TILE - AVATAR) / 2);

        ctx.fillStyle = t.subtext;
        ctx.font = `17px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            truncate(ctx, guess.username, NAME_W),
            avatarX + AVATAR + AVATAR_GAP,
            y + TILE / 2
        );
    }

    return image.toBuffer('image/png');
}
