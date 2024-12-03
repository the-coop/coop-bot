import algosdk from "algosdk";

export default class AlgoHelper {

    static API_URL = 'https://testnet-api.4160.nodely.dev';
    
    static client = null;
    
    static login() {
        this.client = new algosdk.Algodv2(process.env.ALGORAND_KEY, this.API_URL, 443);
        return this.client;
    };

    static createAccount() {
        const account = algosdk.generateAccount();
        const passphrase = algosdk.secretKeyToMnemonic(account.sk);
        return { account, passphrase };
    };
    
    static getAccount() {
        const account = algosdk.mnemonicToSecretKey(process.env.ALGORAND_KEY);
        return account;
    };

    static async mint() {
        let params = await ALGOD_CLIENT.getTransactionParams().do();
        let note = undefined;

        // Whether user accounts will need to be unfrozen before transacting    
        let defaultFrozen = false;

        // integer number of decimals for asset unit calculation
        let decimals = 0;

        // total number of this asset available for circulation   
        let totalIssuance = 1000;

        // Used to display asset units to user    
        let unitName = "Magic Egg";

        // Friendly name of the asset    
        let assetName = "MAGIC_EGG";

        // Optional string pointing to a URL relating to the asset
        let assetURL = "http://someurl";
        //     const assetURL = "https://thecoop.group/items/metadata/MAGIC_EGG.json";

        // Optional hash commitment of some sort relating to the asset. 32 character length.
        let assetMetadataHash = undefined;


        let manager = getAccount().addr;
        let reserve = getAccount().addr;
        let freeze = getAccount().addr;
        let clawback = getAccount().addr;

        // signing and sending "txn" allows "addr" to create an asset
        let txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
            getAccount().addr, note,
            totalIssuance, decimals, 
            defaultFrozen, manager, reserve, freeze, clawback, 
            unitName, assetName, assetURL, 
            assetMetadataHash, params
        );

        let rawSignedTxn = txn.signTxn(getAccount().sk)
        let tx = (await ALGOD_CLIENT.sendRawTransaction(rawSignedTxn).do());

        // wait for transaction to be confirmed
        const ptx = await algosdk.waitForConfirmation(ALGOD_CLIENT, tx.txId, 4);

        // Get the new asset's information from the creator account
        const assetID = ptx["asset-index"];

        //Get the completed Transaction
        console.log("Transaction " + tx.txId + " confirmed in round " + ptx["confirmed-round"]);
        console.log(assetID);
    };

    static async transfer() {
        // Transfer New Asset:
        // Now that account3 can recieve the new tokens 
        // we can tranfer tokens in from the creator
        // to account3
        sender = recoveredAccount1.addr;
        recipient = recoveredAccount3.addr;
        revocationTarget = undefined;
        closeRemainderTo = undefined;
        //Amount of the asset to transfer
        amount = 10;

        // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
        let xtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
                amount,  note, assetID, params);
        // Must be signed by the account sending the asset  
        rawSignedTxn = xtxn.signTxn(recoveredAccount1.sk)
        let xtx = (await algodclient.sendRawTransaction(rawSignedTxn).do());
        console.log("Transaction : " + xtx.txId);
        // wait for transaction to be confirmed
        await waitForConfirmation(algodclient, xtx.txId);

        // You should now see the 10 assets listed in the account information
        console.log("Account 3 = " + recoveredAccount3.addr);
        await printAssetHolding(algodclient, recoveredAccount3.addr, assetID);
    }

};
