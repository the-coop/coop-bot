import { ALGOD_CLIENT } from "./algodclient.mjs";

// Destroy an Asset:
// All of the created assets should now be back in the creators
// Account so we can delete the asset.
// If this is not the case the asset deletion will fail


// First update changing transaction parameters
// We will account for changing transaction parameters
// before every transaction in this example

params = await ALGOD_CLIENT.getTransactionParams().do();
//comment out the next two lines to use suggested fee
// params.fee = 1000;
// params.flatFee = true;

// The address for the from field must be the manager account
// Which is currently the creator addr1
addr = recoveredAccount1.addr;
note = undefined;

// if all assets are held by the asset creator,
// the asset creator can sign and issue "txn" to remove the asset from the ledger. 
let dtxn = algosdk.makeAssetDestroyTxnWithSuggestedParams(
    addr, 
    note, 
    assetID, 
    params);

// The transaction must be signed by the manager which 
// is currently set to account1
rawSignedTxn = dtxn.signTxn(recoveredAccount1.sk)
let dtx = (await algodclient.sendRawTransaction(rawSignedTxn).do());

// Wait for confirmation
confirmedTxn = await algosdk.waitForConfirmation(algodclient, dtx.txId, 4);

//Get the completed Transaction
console.log("Transaction " + dtx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

// The account3 and account1 should no longer contain the asset as it has been destroyed
console.log("Asset ID: " + assetID);
console.log("Account 1 = " + recoveredAccount1.addr);
await printCreatedAsset(algodclient, recoveredAccount1.addr, assetID);
await printAssetHolding(algodclient, recoveredAccount1.addr, assetID);
console.log("Account 3 = " + recoveredAccount3.addr);
await printAssetHolding(algodclient, recoveredAccount3.addr, assetID);  