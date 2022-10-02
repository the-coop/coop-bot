import algosdk from "algosdk";
import { ALGOD_CLIENT } from "./algodclient.mjs";

export default async function optin(to, assetID) {
    const note = (new TextEncoder())
        .encode("Opt-in request.");

    // Opting in to transact with the new asset
    // Allow accounts that want recieve the new asset
    // Have to opt in. To do this they send an asset transfer
    // of the new asset to themseleves 
    // In this example we are setting up the 3rd recovered account to 
    // receive the new asset

    // First update changing transaction parameters
    // We will account for changing transaction parameters
    // before every transaction in this example
    const params = await ALGOD_CLIENT.getTransactionParams().do();

    //comment out the next two lines to use suggested fee
    // params.fee = 1000;
    // params.flatFee = true;

    let sender = to;
    let recipient = sender;

    // We set revocationTarget to undefined as 
    // This is not a clawback operation
    let revocationTarget = undefined;

    // CloseReaminerTo is set to undefined as
    // we are not closing out an asset
    let closeRemainderTo = undefined;

    // We are sending 0 assets
    const amount = 0;

    // signing and sending "txn" allows sender to begin accepting asset specified by creator and index
    let opttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        sender, 
        recipient, 
        closeRemainderTo, 
        revocationTarget,
        amount, 
        note, 
        assetID,
        params
    );

    // Must be signed by the account wishing to opt in to the asset    
    rawSignedTxn = opttxn.signTxn(recoveredAccount3.sk);
    let opttx = (await ALGOD_CLIENT.sendRawTransaction(rawSignedTxn).do());

    // Wait for confirmation
    confirmedTxn = await algosdk.waitForConfirmation(ALGOD_CLIENT, opttx.txId, 4);

    //Get the completed Transaction
    console.log("Transaction " + opttx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

    //You should now see the new asset listed in the account information
    console.log("Account 3 = " + to);
    await printAssetHolding(ALGOD_CLIENT, to, assetID);
}
