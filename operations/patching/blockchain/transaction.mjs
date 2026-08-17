import * as dotenv from 'dotenv';
dotenv.config();

import AlgoHelper from '../../minigames/medium/economy/blockchain/AlgoHelper.mjs';

/**
 * Inspect a transaction the way /import does, without touching the database.
 *
 * Useful for working out why an import was rejected: it prints the same four facts the
 * command checks (type, sender, receiver, asset and amount) against the treasury.
 *
 *   node ./operations/patching/blockchain/transaction.mjs <transactionID>
 */
export default async function transaction(txID) {
    if (!AlgoHelper.client) AlgoHelper.login();

    const tx = await AlgoHelper.lookupTransaction(txID);
    if (!tx) {
        console.log(`Transaction ${txID} not found on ${AlgoHelper.INDEXER_URL}.`);
        return null;
    }

    const treasury = AlgoHelper.address();
    const transfer = tx.assetTransferTransaction;

    console.log(`Transaction: ${txID}`);
    console.log(`  type:      ${tx.txType}`);
    console.log(`  confirmed: round ${tx.confirmedRound ?? 'none'}`);
    console.log(`  sender:    ${tx.sender}`);

    if (!transfer) {
        console.log('  Not an asset transfer, /import would reject this.');
        return tx;
    }

    console.log(`  receiver:  ${transfer.receiver} ${transfer.receiver === treasury ? '(treasury)' : '(NOT the treasury)'}`);
    console.log(`  asset:     ${transfer.assetId}`);
    console.log(`  amount:    ${transfer.amount}`);

    return tx;
};

if (process.argv[1]?.endsWith('transaction.mjs')) {
    const txID = process.argv[2];

    if (!txID) {
        console.error('Usage: node ./operations/patching/blockchain/transaction.mjs <transactionID>');
        process.exit(1);
    }

    transaction(txID)
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
