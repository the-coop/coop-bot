import * as dotenv from 'dotenv';
dotenv.config();

import AlgoHelper from '../../minigames/medium/economy/blockchain/AlgoHelper.mjs';

/**
 * Opt the Coop treasury in to an asset so it can receive it via /import.
 *
 * An opt-in is a zero-amount transfer to self and must be signed by the holder, so this
 * only ever works for the treasury's own account. Users opt in from their own wallet.
 * The creator of an asset is opted in automatically, so this is only needed for assets
 * minted elsewhere and adopted into the registry by hand.
 *
 *   node ./operations/patching/blockchain/optin.mjs <assetID>
 */
export default async function optin(assetIndex) {
    if (!AlgoHelper.client) AlgoHelper.login();

    const address = AlgoHelper.address();

    if (await AlgoHelper.isOptedIn(address, assetIndex)) {
        console.log(`${address} is already opted in to ${assetIndex}.`);
        return null;
    }

    const { txID } = await AlgoHelper.optIn(assetIndex);
    console.log(`Opted ${address} in to ${assetIndex}: ${AlgoHelper.txLink(txID)}`);

    return txID;
};

// Only run when invoked directly, so importing this module has no side effects.
if (process.argv[1]?.endsWith('optin.mjs')) {
    const assetIndex = parseInt(process.argv[2], 10);

    if (isNaN(assetIndex)) {
        console.error('Usage: node ./operations/patching/blockchain/optin.mjs <assetID>');
        process.exit(1);
    }

    optin(assetIndex)
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
