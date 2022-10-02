import algosdk from "algosdk";
// import ALGOD_CLIENT from "./algodclient.mjs";

export function createAccount() {
    const account = algosdk.generateAccount();
    const passphrase = algosdk.secretKeyToMnemonic(account.sk);
    return { account, passphrase };
};

export function getAccount() {
    const account = algosdk.mnemonicToSecretKey(process.env.ALGORAND_KEY);
    return account;
};