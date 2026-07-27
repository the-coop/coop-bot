export const WORD_LENGTH = 5;

// The dictionary is a few megabytes of Hunspell data, so it is loaded on first
// use rather than at boot: Cooper only needs it when a Coopdle actually runs.
let loading = null;
let dictionary = null;

const load = async () => {
    const [{ default: dic }, { default: nspell }] = await Promise.all([
        import('dictionary-en'),
        import('nspell')
    ]);

    // `dictionary-en` ships a Hunspell pair: an affix file describing how words
    // inflect, and a .dic file listing base forms as `word/FLAGS`.
    const speller = nspell(dic);

    // Base forms of exactly five lowercase letters become the answer pool:
    // stripping the affix flags leaves headwords, so "cakes" is never the secret
    // word. Entries are matched before lowercasing, which drops proper nouns and
    // acronyms ("Texas", "ASCII") that would be unfair answers.
    const answers = dic.dic
        .toString('utf8')
        .split('\n')
        .map(line => line.split('/')[0].trim())
        .filter(word => new RegExp(`^[a-z]{${WORD_LENGTH}}$`).test(word));

    dictionary = { speller, answers, answerSet: new Set(answers) };

    return dictionary;
};

// Resolves once the dictionary is usable, loading it if required.
export const ready = () => loading || (loading = load());

export const isLoaded = () => !!dictionary;

export const answerCount = () => dictionary?.answers.length || 0;

// The answer is chosen by offset into the pool, so the caller controls the roll.
export const wordAt = offset => dictionary.answers[offset % dictionary.answers.length];

// Guesses are checked through the speller rather than the answer pool, so
// affix-derived words ("cakes", "boxes", "loved") are playable even though they
// never appear as headwords.
export const isValidGuess = word => {
    const candidate = String(word).toLowerCase();
    if (!new RegExp(`^[a-z]{${WORD_LENGTH}}$`).test(candidate)) return false;
    return dictionary.answerSet.has(candidate) || dictionary.speller.correct(candidate);
};
