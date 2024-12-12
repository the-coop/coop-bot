import { 
    Algodv2, mnemonicToSecretKey,waitForConfirmation,
    makeAssetCreateTxnWithSuggestedParamsFromObject as makeAssetTxn,
    makeAssetTransferTxnWithSuggestedParamsFromObject as makeTransferTxn
} from 'algosdk';

export default class AlgoHelper {

    static API_URL = 'https://testnet-api.algonode.cloud';
    
    static client = null;
    
    static login() {
        try {
            // Initialize without token for Nodely API
            this.client = new Algodv2('', this.API_URL, 443);
            console.log('Algod client initialized:', this.client);
            return this.client;
        } catch (error) {
            console.error('Failed to initialize Algod client:', error);
            throw error;
        }
    };
    
    static async onInteraction(interaction) {
        console.log(interaction);
        console.log('interaction intercepted in algohelper.');;
    };

    static account() {
        const account = mnemonicToSecretKey(process.env.ALGORAND_KEY);
        return account;
    };

    static async mint(name, code, url, total, decimals = 0) {
        const account = this.account();

        let unitName = name;
        let assetName = code;
        let assetURL = url;
        
        // Optional hash commitment of some sort relating to the asset. 32 character length.
        let note = undefined;
        let defaultFrozen = false;
        let assetMetadataHash = undefined;
        let manager = account.addr;
        let reserve = account.addr;
        let freeze = account.addr;
        let clawback = account.addr;

        try {
            // Get the suggested transaction parameters
            const suggestedParams = await this.client.getTransactionParams().do();
            console.log("Suggested Params:", suggestedParams);

            // Create the asset creation transaction
            const txn = makeAssetTxn({
                sender: account.addr,
                total, decimals,
                defaultFrozen,
                manager, reserve, freeze, clawback,
                assetMetadataHash, suggestedParams,
                unitName, assetName, assetURL, note
            });

            // Send the transaction
            const { txid } = await this.client.sendRawTransaction(txn.signTxn(account.sk)).do();
            const confirmation = await waitForConfirmation(this.client, txid, 4);
            console.log(confirmation);

            // TODO: Get AssetIndex, it needs saving to the database.
            // TODO: Return AssetIndex.
            return true;

        } catch (error) {
            console.error("Failed to mint asset:", error);
        }
    };

    static async release(receiver, assetIndex, amount) {
        try {
            const account = this.account();
            const sender = account.addr;
            const closeRemainderTo = undefined; 
            const revocationTarget = undefined;
            const note = undefined;
            const suggestedParams = await this.client.getTransactionParams().do();
            console.log("Suggested Params:", suggestedParams);
            const txn = makeTransferTxn({
                sender, assetSender: sender, receiver, amount, assetIndex, suggestedParams, 
                closeRemainderTo, revocationTarget, note
            });

            const { txid } = await this.client.sendRawTransaction(txn.signTxn(account.sk)).do();
            const confirmation = await waitForConfirmation(this.client, txid, 4);
            console.log(confirmation);

            return true;

        } catch (error) {
            console.error("Failed to transfer asset:", error);
            return false;
        }
    };

};
