import algosdk from "algosdk";
import { getAccount } from "./account.mjs";
import { ALGOD_CLIENT } from "./algodclient.mjs";

export default async function transfer(to, assetID) {
    const account = getAccount();
    const params = await ALGOD_CLIENT.getTransactionParams().do();
    const note = (new TextEncoder())
        .encode("Send to LMF on Testnet to test transactions.");
    
    // Amount of the asset to transfer
    let amount = 1;
    
    // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
    let xtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        account.addr,
        to,
        account.addr,
        account.addr,
        amount, 
        note,
        assetID,
        params
    );
    
    // Must be signed by the account sending the asset  
    let rawSignedTxn = xtxn.signTxn(account.sk)
    let xtx = (await ALGOD_CLIENT.sendRawTransaction(rawSignedTxn).do());
    
    // Wait for confirmation
    let confirmedTxn = await algosdk.waitForConfirmation(ALGOD_CLIENT, xtx.txId, 4);
    
    //Get the completed Transaction
    console.log("Transaction " + xtx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
    
    // You should now see the 10 assets listed in the account information
    console.log("Account 3 = " + to);
    await printAssetHolding(ALGOD_CLIENT, to, assetID);
}
