
// AlgodLogin();

// const tx = transaction();
// console.log(tx);

// let indexerClient = new algosdk.Indexer({ 'X-API-Key': process.env.PURESTAKE_KEY }, INDEXER_URL, '');
// let assetInfo = await indexerClient.searchForAssets().limit(1).do();

// console.log(assetInfo);
// console.log(assetInfo.assets[0].params);

// Function used to print created asset for account and assetid
// const printCreatedAsset = async function (ALGOD_CLIENT, account, assetid) {
//     // note: if you have an indexer instance available it is easier to just search accounts for an asset
//     let accountInfo = await ALGOD_CLIENT.accountInformation(account).do();
//     for (idx = 0; idx < accountInfo['created-assets'].length; idx++) {
//         let scrutinizedAsset = accountInfo['created-assets'][idx];
//         if (scrutinizedAsset['index'] == assetid) {
//             console.log("AssetID = " + scrutinizedAsset['index']);
//             let myparms = JSON.stringify(scrutinizedAsset['params'], undefined, 2);
//             console.log("parms = " + myparms);
//             break;
//         }
//     }
// };

// // Function used to print asset holding for account and assetid
// const printAssetHolding = async function (account, assetid) {
//     // note: if you have an indexer instance available it is easier to just search accounts for an asset
//     let accountInfo = await ALGOD_CLIENT.accountInformation(account).do();
//     for (idx = 0; idx < accountInfo['assets'].length; idx++) {
//         let scrutinizedAsset = accountInfo['assets'][idx];
//         if (scrutinizedAsset['asset-id'] == assetid) {
//             let myassetholding = JSON.stringify(scrutinizedAsset, undefined, 2);
//             console.log("assetholdinginfo = " + myassetholding);
//             break;
//         }
//     }
// };

// await printCreatedAsset(getAccount().addr, assetID);
// await printAssetHolding(getAccount().addr, assetID);

// const accountInfo = await ALGOD_CLIENT.accountInformation(getAccount().addr).do();
// const scrutinizedAsset = accountInfo['created-assets'];
// console.log(scrutinizedAsset);

// Delete these assets 

// optin('3BUZULPTYOU5NIZ4DSWLCSZS22B57NB7XJ7ETYTQOWVVHSMQEAYOLVJZ64', 75915292);

// transfer('3BUZULPTYOU5NIZ4DSWLCSZS22B57NB7XJ7ETYTQOWVVHSMQEAYOLVJZ64', '75915292');

// mint();

// transaction();

// const account = getAccount();
// console.log(account);




