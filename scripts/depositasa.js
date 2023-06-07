import algosdk from "algosdk";
import {
  getMethodByName,
  makeATCCall,
  optIntoApp,
  optIntoAsset,
  createAssetTransferTxn,
} from "../scripts/index.js";
import * as dotenv from "dotenv";
import { createPortal } from "react-dom";
dotenv.config({ path: "./.env.local" });
import * as algotxn from "../scripts/index.js";

const algodClient = new algosdk.Algodv2(
  process.env.NEXT_PUBLIC_ALGOD_TOKEN,
  process.env.NEXT_PUBLIC_ALGOD_ADDRESS,
  process.env.NEXT_PUBLIC_ALGOD_PORT
);

(async () => {
  const creator = algosdk.mnemonicToSecretKey(
    process.env.NEXT_PUBLIC_DEPLOYER_MNEMONIC
  );

  // get app ID
  const appID = Number(process.env.NEXT_PUBLIC_APP_ID);
  console.log("App ID is: ", appID);

  const suggestedParams = await algodClient.getTransactionParams().do();

  const commonParams = {
    appID,
    sender: creator.addr,
    suggestedParams,
    signer: algosdk.makeBasicAccountTransactionSigner(creator),
  };

  const appAddress = algosdk.getApplicationAddress(appID);
  await algotxn.fundAccount(creator, appAddress, 1e5);

  console.log(appAddress);

  const assetID = 91;
  //opt into asset
  const txn1 = [
    {
      method: getMethodByName("optintoasset"),
      ...commonParams,
      appForeignAssets: [assetID],
    },
  ];

  await makeATCCall(txn1);

  const txn2 = [
    {
      method: getMethodByName("depositasatovault"),
      ...commonParams,
      appForeignAssets: [assetID],
    },
  ];

  await makeATCCall(txn2);

  // print ASA info
  console.log(
    await algodClient.accountAssetInformation(appAddress, assetID).do()
  );
})();
