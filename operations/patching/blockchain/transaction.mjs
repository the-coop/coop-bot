import algosdk from "algosdk";
import { getAccount } from "./account.mjs";
import { ALGOD_CLIENT } from "./algodclient.mjs";


export default async function transaction() {
    const params = await ALGOD_CLIENT.getTransactionParams().do();

    const receiver = "HZ57J3K46JIJXILONBBZOHX6BKPXEM2VVXNRFSUED6DKFD5ZD24PMJ3MVA";
    const enc = new TextEncoder();
    const note = enc.encode("Hello World");
    const amount = 1000000;
    
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: getAccount().addr, 
        to: receiver, 
        amount: amount, 
        note: note, 
        suggestedParams: params
    });

    console.log(txn);

    // Sign the transaction
    let signedTxn = txn.signTxn(getAccount().sk);
    let txId = txn.txID().toString();
    console.log("Signed transaction with txID: %s", txId);

    // Submit the transaction
    await ALGOD_CLIENT.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    let confirmedTxn = await waitForConfirmation(txId, 4);

    //Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
    // let mytxinfo = JSON.stringify(confirmedTxn.txn.txn, undefined, 2);
    // console.log("Transaction information: %o", mytxinfo);

    let string = new TextDecoder().decode(confirmedTxn.txn.txn.note);
    console.log("Note field: ", string);

    const accountInfo = await ALGOD_CLIENT.accountInformation(getAccount().addr).do();
    console.log("Transaction Amount: %d microAlgos", confirmedTxn.txn.txn.amt);        
    console.log("Transaction Fee: %d microAlgos", confirmedTxn.txn.txn.fee);
    console.log("Account balance: %d microAlgos", accountInfo.amount);
}



/**
 * Wait until the transaction is confirmed or rejected, or until 'timeout'
 * number of rounds have passed.
 * @param {algosdk.Algodv2} ALGOD_CLIENT the Algod V2 client
 * @param {string} txId the transaction ID to wait for
 * @param {number} timeout maximum number of rounds to wait
 * @return {Promise<*>} pending transaction information
 * @throws Throws an error if the transaction is not confirmed or rejected in the next timeout rounds
 */
 const waitForConfirmation = async function (txId, timeout) {
    if (ALGOD_CLIENT == null || txId == null || timeout < 0) {
        throw new Error("Bad arguments");
    }

    const status = (await ALGOD_CLIENT.status().do());
    if (status === undefined) {
        throw new Error("Unable to get node status");
    }

    const startround = status["last-round"] + 1;
    let currentround = startround;

    while (currentround < (startround + timeout)) {
        const pendingInfo = await ALGOD_CLIENT.pendingTransactionInformation(txId).do();
        if (pendingInfo !== undefined) {
            if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
                //Got the completed Transaction
                return pendingInfo;
            } else {
                if (pendingInfo["pool-error"] != null && pendingInfo["pool-error"].length > 0) {
                    // If there was a pool error, then the transaction has been rejected!
                    throw new Error("Transaction " + txId + " rejected - pool error: " + pendingInfo["pool-error"]);
                }
            }
        }
        await ALGOD_CLIENT.statusAfterBlock(currentround).do();
        currentround++;
    }

    throw new Error("Transaction " + txId + " not confirmed after " + timeout + " rounds!");
};

// private String printBalance(com.algorand.algosdk.account.Account getAccount()) throws Exception {
//     String myAddress = getAccount().getAddress().toString();
//     Response < com.algorand.algosdk.v2.client.model.Account > respAcct = client.AccountInformation(getAccount().getAddress()).execute();
//     if (!respAcct.isSuccessful()) {
//         throw new Exception(respAcct.message());
//     }
//     com.algorand.algosdk.v2.client.model.Account accountInfo = respAcct.body();
//     System.out.println(String.format("Account Balance: %d microAlgos", accountInfo.amount));
//     return myAddress;
// }