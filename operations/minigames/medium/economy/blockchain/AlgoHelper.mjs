import {
    Algodv2, Indexer, mnemonicToSecretKey, waitForConfirmation, isValidAddress,
    makeAssetCreateTxnWithSuggestedParamsFromObject as makeAssetTxn,
    makeAssetTransferTxnWithSuggestedParamsFromObject as makeTransferTxn
} from 'algosdk';

// Minimum balance the network locks up per asset the treasury creates or holds, in microAlgos.
const ASSET_MIN_BALANCE = 100000;

export default class AlgoHelper {

    static API_URL = process.env.ALGORAND_API_URL || 'https://testnet-api.algonode.cloud';

    // The indexer is a separate service to algod: algod only knows about the transactions
    // still in its pool, so any lookup of a past transaction (i.e. /import) has to go here.
    static INDEXER_URL = process.env.ALGORAND_INDEXER_URL || 'https://testnet-idx.algonode.cloud';

    static EXPLORER_URL = process.env.ALGORAND_EXPLORER_URL || 'https://testnet.explorer.perawallet.app';

    static client = null;

    static indexer = null;

    static _account = null;

    static login() {
        try {
            // Initialise without token for the Nodely/AlgoNode API.
            this.client = new Algodv2('', this.API_URL, 443);
            this.indexer = new Indexer('', this.INDEXER_URL, 443);
            return this.client;
        } catch (error) {
            console.error('Failed to initialize Algod client:', error);
            throw error;
        }
    };

    static async onInteraction(interaction) {
        console.log(interaction);
        console.log('interaction intercepted in algohelper.');
    };

    static account() {
        // Cached: mnemonicToSecretKey re-derives the keypair on every call.
        if (!this._account) {
            if (!process.env.ALGORAND_KEY)
                throw new Error('ALGORAND_KEY is not configured.');

            this._account = mnemonicToSecretKey(process.env.ALGORAND_KEY);
        }
        return this._account;
    };

    // Treasury address as a string. In algosdk v3 account.addr is an Address instance,
    // so anything comparing against an indexer/config string needs this rather than .addr.
    static address() {
        return this.account().addr.toString();
    };

    static isValidAddress(address) {
        return typeof address === 'string' && isValidAddress(address);
    };

    static txLink(txID) {
        return `${this.EXPLORER_URL}/tx/${txID}`;
    };

    static assetLink(assetIndex) {
        return `${this.EXPLORER_URL}/asset/${assetIndex}`;
    };

    // ASA unit names are capped at 8 bytes, which most ITEM_CODEs blow through
    // (EMPTY_GIFTBOX is 13). Strip the separators and truncate so minting can't 400.
    static unitName(itemCode) {
        return itemCode.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
    };

    static async balance(address = null) {
        const info = await this.client.accountInformation(address || this.address()).do();
        return {
            amount: Number(info.amount),
            minBalance: Number(info.minBalance ?? 0),
            spendable: Number(info.amount) - Number(info.minBalance ?? 0)
        };
    };

    // Cost of creating one more asset, so a bulk mint can bail before it half-completes.
    static get ASSET_MIN_BALANCE() {
        return ASSET_MIN_BALANCE;
    };

    /**
     * Create a new Algorand Standard Asset for an item.
     *
     * @param {string} itemCode ITEM_CODE the asset represents, used as the asset name.
     * @param {object} options total/decimals/url/unitName overrides.
     * @returns {Promise<{ assetIndex: number, txID: string }>}
     */
    static async mint(itemCode, options = {}) {
        const account = this.account();
        const sender = account.addr;

        const {
            total = 1000,
            decimals = 0,
            url = `https://thecoop.group/items/metadata/${itemCode}`,
            unitName = this.unitName(itemCode),
            assetName = itemCode,
            note
        } = options;

        // The treasury keeps every role so items can be re-issued, frozen and
        // clawed back if a mint or a transfer goes wrong.
        const manager = sender;
        const reserve = sender;
        const freeze = sender;
        const clawback = sender;

        const suggestedParams = await this.client.getTransactionParams().do();

        const txn = makeAssetTxn({
            sender,
            total, decimals,
            defaultFrozen: false,
            manager, reserve, freeze, clawback,
            suggestedParams,
            unitName, assetName, assetURL: url,
            note: note ? new TextEncoder().encode(note) : undefined
        });

        const txID = txn.txID();
        await this.client.sendRawTransaction(txn.signTxn(account.sk)).do();

        const confirmation = await waitForConfirmation(this.client, txID, 4);

        // v3 returns camelCase bigints, and assetIndex is only set on a create.
        const assetIndex = confirmation.assetIndex;
        if (!assetIndex)
            throw new Error(`Minted ${itemCode} but the confirmation carried no assetIndex.`);

        return { assetIndex: Number(assetIndex), txID };
    };

    /**
     * Has this address opted in to the asset? Transferring to an address that has not
     * opted in fails on chain, so this is checked before anything is taken off a user.
     */
    static async isOptedIn(address, assetIndex) {
        try {
            const holding = await this.client
                .accountAssetInformation(address, Number(assetIndex))
                .do();
            return !!holding?.assetHolding;
        } catch (error) {
            // Algod 404s when the account holds no such asset, which is a clean "no".
            if (error?.status === 404) return false;
            throw error;
        }
    };

    /** Quantity of an asset the given address (default: the treasury) currently holds. */
    static async holdingAmount(assetIndex, address = null) {
        try {
            const holding = await this.client
                .accountAssetInformation(address || this.address(), Number(assetIndex))
                .do();
            return Number(holding?.assetHolding?.amount ?? 0);
        } catch (error) {
            if (error?.status === 404) return 0;
            throw error;
        }
    };

    /**
     * Send an asset from the treasury to a user.
     *
     * @returns {Promise<{ txID: string }>} throws instead of returning false so callers
     *          can refund on failure rather than guess at what went wrong.
     */
    static async release(receiver, assetIndex, amount) {
        const account = this.account();
        const suggestedParams = await this.client.getTransactionParams().do();

        // NB: assetSender must stay unset. Setting it makes this a clawback/revocation
        // transaction that takes the asset FROM that address, which is not a payout.
        const txn = makeTransferTxn({
            sender: account.addr,
            receiver,
            amount: Number(amount),
            assetIndex: Number(assetIndex),
            suggestedParams
        });

        const txID = txn.txID();
        await this.client.sendRawTransaction(txn.signTxn(account.sk)).do();
        await waitForConfirmation(this.client, txID, 4);

        return { txID };
    };

    /**
     * Opt an address in to an asset. Only usable for the treasury's own account:
     * an opt-in is a zero transfer to self and has to be signed by the holder,
     * so users must do their own from their wallet.
     */
    static async optIn(assetIndex) {
        const account = this.account();
        const suggestedParams = await this.client.getTransactionParams().do();

        const txn = makeTransferTxn({
            sender: account.addr,
            receiver: account.addr,
            amount: 0,
            assetIndex: Number(assetIndex),
            suggestedParams
        });

        const txID = txn.txID();
        await this.client.sendRawTransaction(txn.signTxn(account.sk)).do();
        await waitForConfirmation(this.client, txID, 4);

        return { txID };
    };

    /** Look a confirmed transaction up by ID via the indexer. Null when unknown. */
    static async lookupTransaction(txID) {
        try {
            const result = await this.indexer.lookupTransactionByID(txID).do();
            return result?.transaction ?? null;
        } catch (error) {
            if (error?.status === 404) return null;
            throw error;
        }
    };

    /** On-chain params of an asset, or null if it does not exist. */
    static async assetInfo(assetIndex) {
        try {
            const asset = await this.client.getAssetByID(Number(assetIndex)).do();
            return asset ?? null;
        } catch (error) {
            if (error?.status === 404) return null;
            throw error;
        }
    };

};
