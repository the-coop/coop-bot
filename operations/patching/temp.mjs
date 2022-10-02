import algosdk from 'algosdk';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'https://testnet-algorand.api.purestake.io/ps2';
const token = { 'X-API-Key': process.env.PURESTAKE_KEY };

const algodclient = new algosdk.Algodv2(token, API_URL, '');

const checkBalance = async (account) => {
    let accountInfo = await algodclient.accountInformation(account.addr).do();
    console.log("Account balance: %d microAlgos", accountInfo.amount);
    return accountInfo;
};

// mintNFT(unitName, assetName, assetURL);

// checkBalance(getAccount());

// console.log(getAccount());
// console.log(await algodclient.status().do());

// const testMe = '3BUZULPTYOU5NIZ4DSWLCSZS22B57NB7XJ7ETYTQOWVVHSMQEAYOLVJZ64';
// sendTx(testMe, 100000);


// Transfer New Asset:
// Now that account3 can recieve the new tokens 
// we can tranfer tokens in from the creator
// to account3
// First update changing transaction parameters
// We will account for changing transaction parameters
// before every transaction in this example

// mintNFT(unitName, assetName, assetURL);

