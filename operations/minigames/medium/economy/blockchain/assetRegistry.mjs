import Database from 'coop-shared/setup/database.mjs';
import { ITEMS as ITEMS_CONFIG, exportableItems } from 'coop-shared/config.mjs';

// ITEM_CODE -> Algorand asset ID mapping.
//
// The items config lives in coop-shared (a git dependency), so a mint run cannot write
// its result back there. The mapping is kept in the `chicken` key/value table instead,
// one row per item, which means the bot on Heroku picks up a mint the moment the patch
// script commits it and no schema migration is needed. Whatever is already hardcoded as
// `assetID` in the shared items config still works as a fallback.
const PREFIX = 'algo_asset_';

export default class AssetRegistry {

    static _cache = null;

    static _cachedAt = 0;

    // Short lived so a mint run by the patch script is picked up by an already running
    // bot, without querying on every single /export.
    static CACHE_MS = 5 * 60 * 1000;

    static key(itemCode) {
        return PREFIX + itemCode;
    };

    /** Static assetIDs declared in the shared items config, keyed by ITEM_CODE. */
    static configured() {
        return Object.keys(ITEMS_CONFIG).reduce((acc, code) => {
            const assetID = ITEMS_CONFIG[code]?.assetID;
            if (assetID) acc[code] = parseInt(assetID, 10);
            return acc;
        }, {});
    };

    /** Full ITEM_CODE -> assetID map, database rows layered over the config defaults. */
    static async all(refresh = false) {
        const fresh = this._cache && (Date.now() - this._cachedAt) < this.CACHE_MS;
        if (fresh && !refresh) return this._cache;

        const map = this.configured();

        const result = await Database.query({
            name: 'get-algo-assets',
            text: 'SELECT attribute, value FROM chicken WHERE attribute LIKE ?',
            values: [PREFIX + '%']
        });

        (result.rows || []).forEach(row => {
            const code = row.attribute.slice(PREFIX.length);
            const assetID = parseInt(row.value, 10);
            if (code && !isNaN(assetID)) map[code] = assetID;
        });

        this._cache = map;
        this._cachedAt = Date.now();
        return map;
    };

    static async get(itemCode) {
        const map = await this.all();
        return map[itemCode] ?? null;
    };

    /** Reverse lookup used by /import to turn an on-chain asset back into an ITEM_CODE. */
    static async itemCodeOf(assetID) {
        const map = await this.all();
        const target = Number(assetID);
        return Object.keys(map).find(code => map[code] === target) ?? null;
    };

    static async set(itemCode, assetID) {
        await Database.query({
            name: 'set-algo-asset',
            text: `INSERT INTO chicken(attribute, value)
                VALUES(?, ?)
                ON DUPLICATE KEY UPDATE value = VALUES(value)`,
            values: [this.key(itemCode), String(assetID)]
        });

        if (this._cache) this._cache[itemCode] = Number(assetID);

        return Number(assetID);
    };

    static async unset(itemCode) {
        await Database.query({
            name: 'unset-algo-asset',
            text: 'DELETE FROM chicken WHERE attribute = ?',
            values: [this.key(itemCode)]
        });

        if (this._cache) delete this._cache[itemCode];
    };

    /**
     * ITEM_CODEs with no asset minted yet.
     *
     * Only exportable items count as missing: the hierarchy offices are deliberately kept
     * off the chain, so listing them here would make a complete deploy look unfinished.
     */
    static async missing() {
        const map = await this.all(true);
        return exportableItems().filter(code => !map[code]);
    };

};
