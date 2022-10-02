import algosdk from "algosdk";
import { getAccount } from "./account.mjs";
import { ALGOD_CLIENT } from "./algodclient.mjs";


export default async function mint() {
    let params = await ALGOD_CLIENT.getTransactionParams().do();

    // comment out the next two lines to use suggested fee
    // params.fee = 1000;
    // params.flatFee = true;

    // arbitrary data to be stored in the transaction; here, none is stored
    let note = undefined;

    // Asset creation specific parameters
    // The following parameters are asset specific
    // Throughout the example these will be re-used. 
    // We will also change the manager later in the example


    // Whether user accounts will need to be unfrozen before transacting    
    let defaultFrozen = false;

    // integer number of decimals for asset unit calculation
    let decimals = 0;

    // total number of this asset available for circulation   
    let totalIssuance = 1000;

    // Used to display asset units to user    
    let unitName = "MagicEgg";

    // Friendly name of the asset    
    let assetName = "magicegg";

    // Optional string pointing to a URL relating to the asset
    let assetURL = "http://someurl";

    // Optional hash commitment of some sort relating to the asset. 32 character length.
    // let assetMetadataHash = "16efaa3924a6fd9d3a4824799a4ac65d";
    let assetMetadataHash = undefined;

    // The following parameters are the only ones
    // that can be changed, and they have to be changed
    // by the current manager
    // Specified address can change reserve, freeze, clawback, and manager
    let manager = getAccount().addr;
    
    // Specified address is considered the asset reserve
    // (it has no special privileges, this is only informational)
    let reserve = getAccount().addr;
    
    // Specified address can freeze or unfreeze user asset holdings 
    let freeze = getAccount().addr;
    
    // Specified address can revoke user asset holdings and send 
    // them to other addresses    
    let clawback = getAccount().addr;

    // signing and sending "txn" allows "addr" to create an asset
    let txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
        getAccount().addr, 
        note,
        totalIssuance, 
        decimals, 
        defaultFrozen, 
        manager, 
        reserve, 
        freeze,
        clawback, 
        unitName, 
        assetName, 
        assetURL, 
        assetMetadataHash, 
        params
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
}

// const mintNFT = async (unitName, assetName, assetURL) => {
// const mintNFT = async () => {
//     const unitName = "MAGIC_EGG"; 
//     const assetName = "Egg";
//     const assetURL = "https://thecoop.group/items/metadata/MAGIC_EGG.json";

//     const account = getAccount()unt();

//     const note = undefined; 
//     const addr = account.addr;

//     const defaultFrozen = false;

//     const decimals = 0;
//     const totalIssuance = 1000

//     const params = await ALGOD_CLIENT.getTransactionParams().do();

//     // const assetMetadataHash = 'QUxHT1JBTkRfRk9SQ0VEX01FX1RPX0RPX1RISVM=';
//     const assetMetadataHash = undefined;

//     // signing and sending "txn" allows "addr" to create an asset
//     const txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
//         addr, note,
//         totalIssuance, decimals, defaultFrozen, 
//         addr, addr, addr, addr, 
//         unitName, assetName, assetURL, assetMetadataHash, params
//     );

//     const rawSignedTxn = txn.signTxn(account.sk)
//     const tx = (await ALGOD_CLIENT.sendRawTransaction(rawSignedTxn).do());

//     // Wait for the method being added to sdk!
//     // await waitForConfirmation(ALGOD_CLIENT, tx.txId);

//     // Get the new asset's information from the creator account
//     const ptx = await ALGOD_CLIENT.pendingTransactionInformation(tx.txId).do();
//     const assetID = ptx["asset-index"];

//     // console.log(tx);
//     console.log(ptx);
//     console.log(assetID);
// };