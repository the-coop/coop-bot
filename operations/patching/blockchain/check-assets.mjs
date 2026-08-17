import * as dotenv from 'dotenv';
dotenv.config();

import Database from 'coop-shared/setup/database.mjs';
import { ITEMS as ITEMS_CONFIG } from 'coop-shared/config.mjs';

import AlgoHelper from '../../minigames/medium/economy/blockchain/AlgoHelper.mjs';
import AssetRegistry from '../../minigames/medium/economy/blockchain/assetRegistry.mjs';

/**
 * Read-only audit of the item to asset mapping that /export and /import depend on.
 *
 * For every item it reports whether an asset is registered, whether that asset actually
 * exists on chain, and how much of it the treasury still has to pay exports out with.
 *
 *   node ./operations/patching/blockchain/check-assets.mjs
 */
const checkAssets = async () => {
    // ALGORAND_KEY is optional here, the asset checks work without a treasury.
    if (!process.env.DATABASE_URL)
        throw new Error('Missing DATABASE_URL in the environment (.env).');

    await Database.connect();
    AlgoHelper.login();

    const registry = await AssetRegistry.all(true);
    const codes = Object.keys(ITEMS_CONFIG);

    let treasury = null;
    try {
        treasury = AlgoHelper.address();
        console.log(`Treasury: ${treasury}`);
        const { amount, spendable } = await AlgoHelper.balance();
        console.log(`Balance:  ${amount / 1e6} ALGO (${spendable / 1e6} spendable)`);
    } catch (error) {
        // Without ALGORAND_KEY the asset checks still work, only holdings are skipped.
        console.log(`No treasury key available (${error?.message || error}), skipping holdings.`);
    }

    console.log(`Network:  ${AlgoHelper.API_URL}\n`);

    const missing = [];
    const broken = [];
    const empty = [];

    for (const code of codes) {
        const assetID = registry[code];

        if (!assetID) {
            missing.push(code);
            continue;
        }

        const info = await AlgoHelper.assetInfo(assetID);
        if (!info) {
            broken.push({ code, assetID });
            console.log(`${code.padEnd(16)} ${String(assetID).padEnd(12)} MISSING ON CHAIN`);
            continue;
        }

        let holdingText = '';
        if (treasury) {
            const held = await AlgoHelper.holdingAmount(assetID);
            if (held < 1) empty.push({ code, assetID });
            holdingText = ` treasury=${held}/${info.params.total}`;
        }

        console.log(`${code.padEnd(16)} ${String(assetID).padEnd(12)} ${info.params.unitName || '?'}${holdingText}`);
    }

    console.log(`\n${codes.length - missing.length}/${codes.length} items have an asset.`);

    if (missing.length)
        console.log(`\nNot deployed (run deploy-assets.mjs): ${missing.join(', ')}`);

    // A registered ID that does not resolve means the registry is lying to /export.
    if (broken.length)
        console.log(`\nRegistered but not on chain: ${broken.map(b => `${b.code}=${b.assetID}`).join(', ')}`);

    // Exports of these will be refused because the treasury has nothing to send.
    if (empty.length)
        console.log(`\nTreasury holds none of: ${empty.map(e => e.code).join(', ')}`);

    return { missing, broken, empty };
};

checkAssets()
    .then(({ missing, broken }) => process.exit(missing.length || broken.length ? 1 : 0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
