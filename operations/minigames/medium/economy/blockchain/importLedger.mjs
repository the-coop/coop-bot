import Database from 'coop-shared/setup/database.mjs';

// Record of which on-chain transactions have already been redeemed by /import.
//
// Without this, the same transaction ID could be handed in repeatedly and mint the
// item into the economy over and over. Kept in the `chicken` key/value table (the only
// writable store this repo can add to without a coop-shared schema migration) and the
// claim leans on that table's UNIQUE key over `attribute`, so two concurrent /import
// calls for the same transaction cannot both succeed.
const PREFIX = 'algo_import_';

export default class ImportLedger {

    static key(txID) {
        return PREFIX + txID;
    };

    /**
     * Try to claim a transaction. Returns true only for the caller that got there
     * first; every later attempt on the same transaction gets false.
     */
    static async claim(txID, discordID, itemCode, quantity) {
        const result = await Database.query({
            name: 'claim-algo-import',
            text: `INSERT IGNORE INTO chicken(attribute, value) VALUES(?, ?)`,
            values: [this.key(txID), `${discordID}:${itemCode}:${quantity}`]
        });

        return result.rowCount > 0;
    };

    /** Undo a claim so the user can retry, used when crediting the item afterwards fails. */
    static async release(txID) {
        await Database.query({
            name: 'release-algo-import',
            text: 'DELETE FROM chicken WHERE attribute = ?',
            values: [this.key(txID)]
        });
    };

    static async isClaimed(txID) {
        const result = await Database.query({
            name: 'check-algo-import',
            text: 'SELECT value FROM chicken WHERE attribute = ?',
            values: [this.key(txID)]
        });

        return (result.rows || []).length > 0;
    };

};
