import * as dotenv from 'dotenv';
dotenv.config();

import AlgoHelper from '../../minigames/medium/economy/blockchain/AlgoHelper.mjs';

/**
 * Send an item's asset from the treasury to an address by hand, for repairing a failed
 * /export or seeding a wallet for testing.
 *
 *   node ./operations/patching/blockchain/transfer.mjs <address> <assetID> [amount]
 */
export default async function transfer(to, assetIndex, amount = 1) {
    if (!AlgoHelper.client) AlgoHelper.login();

    if (!AlgoHelper.isValidAddress(to))
        throw new Error(`Invalid Algorand address: ${to}`);

    // Both of these fail the transaction on chain, so check before spending a fee.
    if (!await AlgoHelper.isOptedIn(to, assetIndex))
        throw new Error(`${to} has not opted in to asset ${assetIndex}.`);

    const held = await AlgoHelper.holdingAmount(assetIndex);
    if (held < amount)
        throw new Error(`Treasury holds ${held} of asset ${assetIndex}, cannot send ${amount}.`);

    const { txID } = await AlgoHelper.release(to, assetIndex, amount);
    console.log(`Sent ${amount} of ${assetIndex} to ${to}: ${AlgoHelper.txLink(txID)}`);

    return txID;
};

if (process.argv[1]?.endsWith('transfer.mjs')) {
    const [to, assetArg, amountArg] = process.argv.slice(2);
    const assetIndex = parseInt(assetArg, 10);
    const amount = parseInt(amountArg ?? '1', 10);

    if (!to || isNaN(assetIndex) || isNaN(amount)) {
        console.error('Usage: node ./operations/patching/blockchain/transfer.mjs <address> <assetID> [amount]');
        process.exit(1);
    }

    transfer(to, assetIndex, amount)
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error?.message || error);
            process.exit(1);
        });
}
