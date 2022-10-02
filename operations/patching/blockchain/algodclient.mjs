import algosdk from "algosdk";

export let ALGOD_CLIENT = null;

export const API_URL = 'https://testnet-algorand.api.purestake.io/ps2';

export const INDEXER_URL = 'https://testnet-algorand.api.purestake.io/idx2';

export default function login() {
    const token = { 'X-API-Key': process.env.PURESTAKE_KEY };
    ALGOD_CLIENT = new algosdk.Algodv2(token, API_URL, '');
}