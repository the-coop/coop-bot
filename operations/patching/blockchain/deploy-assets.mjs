import * as dotenv from 'dotenv';
dotenv.config();

import Database from 'coop-shared/setup/database.mjs';
import {
    ITEMS as ITEMS_CONFIG, rarityOf, supplyOf, isExportable, exportableItems
} from 'coop-shared/config.mjs';

import AlgoHelper from '../../minigames/medium/economy/blockchain/AlgoHelper.mjs';
import AssetRegistry from '../../minigames/medium/economy/blockchain/assetRegistry.mjs';

/**
 * Deploy every exportable ITEM_CODE in the shared items config as an Algorand Standard
 * Asset, so those items can be exported to and imported from the chain.
 *
 * Items marked `exportable: false` there are never minted, and --only refuses them
 * outright: the hierarchy offices (ELECTION_CROWN, LEADERS_SWORD) are the roles they
 * confer, and an election has to be able to take one back off its holder - which it
 * cannot do once the item is sitting in somebody's wallet.
 *
 * Idempotent: items that already have an asset ID (from the registry or hardcoded in
 * coop-shared's items config) are skipped unless --force is passed, so this can be run
 * again after adding items or after a partial failure.
 *
 *   yarn deploy-assets --dry-run              list what would be minted, touch nothing
 *   yarn deploy-assets                        mint every item still missing an asset
 *   yarn deploy-assets --only=WOOD,AXE        mint just these
 *   yarn deploy-assets --force --only=WOOD    re-mint (new asset ID, old one orphaned)
 *   yarn deploy-assets --nft                  total 1 per item (pure ARC-3 NFT)
 *   yarn deploy-assets --total=5000           one flat supply, overriding every rarity
 *   yarn deploy-assets --no-optin             skip the treasury opt-in check
 *   yarn deploy-assets --no-circulation-check mint even if a cap is below what is held
 *
 * Note on supply: the economy treats items as fungible (/export takes a quantity), so
 * assets are minted with decimals 0 - indivisible units, NFT-like per unit - and a total
 * taken from the item's rarity tier in coop-shared's items config (RARITIES there). The
 * tiers are the game's own rarities: UNIQUE mints one of one, EVENT/LEGENDARY/RARE stay
 * scarce, AVERAGE and COMMON are roomy, and CURRENCY (COOP_POINT) is effectively
 * uncapped. --total forces one flat supply for everything and --nft forces a one-of-one,
 * which only makes sense for unique items such as LEADERS_SWORD and will make /export
 * fail for anything a user can hold more than one of.
 *
 * An asset's total is fixed at creation, so before minting anything the caller's whole
 * database is checked: if an item's cap is below the quantity already held by users,
 * the mint would produce an asset that cannot back the existing balances, and that item
 * is dropped from the run rather than deployed broken.
 */

const parseArgs = argv => {
    const args = { flags: new Set(), options: {} };

    argv.forEach(arg => {
        if (!arg.startsWith('--')) return;
        const [key, value] = arg.slice(2).split('=');
        if (typeof value === 'undefined') args.flags.add(key);
        else args.options[key] = value;
    });

    return args;
};

const { flags, options } = parseArgs(process.argv.slice(2));

const DRY_RUN = flags.has('dry-run');
const FORCE = flags.has('force');
const SKIP_OPTIN = flags.has('no-optin');
const SKIP_CIRCULATION = flags.has('no-circulation-check');
const DECIMALS = parseInt(options.decimals ?? '0', 10);
const URL_BASE = options['url-base'] || 'https://thecoop.group/items/metadata';

// Supply is per rarity tier unless the caller flattens it: --nft for one-of-ones,
// --total to force a single figure across every item being minted.
const TOTAL_OVERRIDE = flags.has('nft') ? 1 : (options.total ? parseInt(options.total, 10) : null);
const supplyFor = code => TOTAL_OVERRIDE ?? supplyOf(code);

// AlgoNode rate limits bursts, and 60+ mints back to back will trip it.
const DELAY_MS = parseInt(options.delay ?? '1500', 10);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const requireEnv = () => {
    const missing = ['DATABASE_URL', 'ALGORAND_KEY'].filter(key => !process.env[key]);
    if (missing.length)
        throw new Error(`Missing ${missing.join(' and ')} in the environment (.env).`);
};

/** ITEM_CODE -> quantity currently held across every user, for the cap sanity check. */
const circulation = async () => {
    const { rows } = await Database.query({
        name: 'items-circulation',
        text: `SELECT item_code, SUM(quantity) AS held FROM items GROUP BY item_code`,
        values: []
    });

    return rows.reduce((acc, row) => {
        acc[row.item_code] = Number(row.held) || 0;
        return acc;
    }, {});
};

const deployAssets = async () => {
    if (TOTAL_OVERRIDE !== null && (isNaN(TOTAL_OVERRIDE) || TOTAL_OVERRIDE < 1))
        throw new Error(`Invalid --total: ${options.total}`);

    requireEnv();

    await Database.connect();
    AlgoHelper.login();

    const treasury = AlgoHelper.address();
    console.log(`Treasury: ${treasury}`);
    console.log(`Network:  ${AlgoHelper.API_URL}`);

    const existing = await AssetRegistry.all(true);

    // Resolve the target list: --only wins, otherwise every exportable item in the config.
    const requested = options.only
        ? options.only.split(',').map(code => code.trim().toUpperCase()).filter(Boolean)
        : exportableItems();

    const unknown = requested.filter(code => !ITEMS_CONFIG[code]);
    if (unknown.length)
        throw new Error(`Unknown ITEM_CODE(s): ${unknown.join(', ')}`);

    // Named explicitly via --only, but the config says they must not exist on chain.
    // Refused rather than silently dropped, so a typo'd --only cannot look like a success.
    const forbidden = requested.filter(code => !isExportable(code));
    if (forbidden.length)
        throw new Error(
            `Refusing to mint non-exportable item(s): ${forbidden.join(', ')}. ` +
            `These are marked exportable: false in coop-shared's items config because the ` +
            `bot has to stay authoritative over who holds them.`
        );

    const skipped = FORCE ? [] : requested.filter(code => existing[code]);
    let targets = FORCE ? requested : requested.filter(code => !existing[code]);

    console.log(`\n${requested.length} item(s) requested, ${skipped.length} already deployed, ${targets.length} to mint.`);
    if (skipped.length)
        console.log(`Skipping (pass --force to re-mint): ${skipped.join(', ')}`);

    if (!targets.length) {
        console.log('\nNothing to do.');
        return { minted: [], failed: [] };
    }

    // A cap below what users already hold cannot be fixed after the fact - an ASA's total
    // is set at creation - so those items are pulled out of the run and reported instead.
    const failed = [];

    if (!SKIP_CIRCULATION) {
        const held = await circulation();
        const undersupplied = targets.filter(code => (held[code] ?? 0) > supplyFor(code));

        undersupplied.forEach(code => failed.push({
            code,
            error: `${rarityOf(code)} cap of ${supplyFor(code)} is below the ${held[code]} already held by users`
        }));

        if (undersupplied.length) {
            console.log(`\nSupply cap too low for ${undersupplied.length} item(s), excluded from this run:`);
            undersupplied.forEach(code => console.log(
                `  ${code.padEnd(16)} ${rarityOf(code)} cap ${supplyFor(code)} < ${held[code]} held`
            ));
            console.log('Raise the tier in coop-shared/config/items.mjs, or pass --no-circulation-check.');

            targets = targets.filter(code => !undersupplied.includes(code));
            if (!targets.length) return { minted: [], failed };
        }
    }

    // Grouped so a run's scarcity is reviewable at a glance before any ALGO is spent.
    const byRarity = targets.reduce((acc, code) => {
        const tier = TOTAL_OVERRIDE ? `--total=${TOTAL_OVERRIDE}` : rarityOf(code);
        (acc[tier] = acc[tier] || []).push(code);
        return acc;
    }, {});

    console.log('\nSupply per rarity:');
    Object.entries(byRarity).forEach(([tier, codes]) => console.log(
        `  ${tier.padEnd(10)} ${String(supplyFor(codes[0])).padStart(10)} each x ${codes.length}: ${codes.join(', ')}`
    ));

    // Each asset created locks 0.1 ALGO of the treasury's balance forever, plus fees.
    // Check up front rather than dying halfway through a 65 item run.
    const required = targets.length * (AlgoHelper.ASSET_MIN_BALANCE + 1000);
    const { spendable } = await AlgoHelper.balance();
    console.log(`Spendable: ${spendable / 1e6} ALGO, need ~${required / 1e6} ALGO for ${targets.length} asset(s).`);

    if (spendable < required && !DRY_RUN)
        throw new Error(`Treasury cannot cover ${targets.length} mints. Fund ${treasury} first.`);

    if (DRY_RUN) {
        console.log('\n--dry-run, nothing will be minted:');
        targets.forEach(code => console.log(
            `  ${code.padEnd(16)} unit=${AlgoHelper.unitName(code).padEnd(8)} rarity=${rarityOf(code).padEnd(9)} total=${String(supplyFor(code)).padStart(10)} decimals=${DECIMALS} url=${URL_BASE}/${code}`
        ));
        return { minted: [], failed };
    }

    const minted = [];

    for (const [index, code] of targets.entries()) {
        const position = `[${index + 1}/${targets.length}]`;

        try {
            const total = supplyFor(code);
            const { assetIndex, txID } = await AlgoHelper.mint(code, {
                total,
                decimals: DECIMALS,
                url: `${URL_BASE}/${code}`
            });

            // Persist before anything else can fail: an asset that exists on chain but
            // is missing from the registry is invisible to /export and /import, and
            // re-running would mint a duplicate.
            await AssetRegistry.set(code, assetIndex);

            minted.push({ code, assetIndex, txID, total });
            console.log(`${position} ${code} (${rarityOf(code)}, ${total}) -> ${assetIndex}  ${AlgoHelper.assetLink(assetIndex)}`);

        } catch (error) {
            failed.push({ code, error: error?.message || String(error) });
            console.error(`${position} ${code} FAILED: ${error?.message || error}`);
        }

        if (index < targets.length - 1) await wait(DELAY_MS);
    }

    // The creator is opted in automatically, so this only matters for assets minted by
    // some other account and adopted into the registry by hand.
    if (!SKIP_OPTIN) {
        for (const { code, assetIndex } of minted) {
            try {
                if (!await AlgoHelper.isOptedIn(treasury, assetIndex)) {
                    await AlgoHelper.optIn(assetIndex);
                    console.log(`Opted treasury in to ${code} (${assetIndex}).`);
                    await wait(DELAY_MS);
                }
            } catch (error) {
                console.error(`Opt-in check failed for ${code}: ${error?.message || error}`);
            }
        }
    }

    console.log(`\nMinted ${minted.length}, failed ${failed.length}.`);
    if (failed.length)
        console.log(`Failed: ${failed.map(f => `${f.code} (${f.error})`).join(', ')}`);

    // Printed so the mapping can also be pasted into coop-shared's items config if the
    // static copy is wanted there. The registry rows above are what the bot actually reads.
    if (minted.length) {
        console.log('\nassetID mapping:');
        console.log(JSON.stringify(
            minted.reduce((acc, m) => ({ ...acc, [m.code]: String(m.assetIndex) }), {}),
            null, 2
        ));
    }

    const stillMissing = await AssetRegistry.missing();
    if (stillMissing.length)
        console.log(`\nItems still without an asset: ${stillMissing.join(', ')}`);
    else
        console.log('\nEvery item now has an Algorand asset.');

    return { minted, failed };
};

deployAssets()
    .then(({ failed }) => process.exit(failed.length ? 1 : 0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
