import algosdk from "algosdk";
import {
  getMethodByName,
  makeATCCall,
  optIntoApp,
} from "../src/algorand/index.js";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

const algodClient = new algosdk.Algodv2(
  process.env.NEXT_PUBLIC_ALGOD_TOKEN,
  process.env.NEXT_PUBLIC_ALGOD_ADDRESS,
  process.env.NEXT_PUBLIC_ALGOD_PORT
);


  // sign the transaction and submit to network
  console.log(await signAndSubmit(algodClient, [txn], sender));
};

(async () => {
  const creator = algosdk.mnemonicToSecretKey(
    process.env.NEXT_PUBLIC_DEPLOYER_MNEMONIC
  );

  // get app ID
  const appID = Number(process.env.APP_ID);
  console.log("App ID is: ", appID);

  const suggestedParams = await algodClient.getTransactionParams().do();

  const commonParams = {
    appID,
    sender: creator.addr,
    suggestedParams,
    signer: algosdk.makeBasicAccountTransactionSigner(creator),
  };

  // payment 1 txn
  const appAddress = algosdk.getApplicationAddress(appID);
  await algotxn.fundAccount(creator, appAddress, 1e5);
  //opt into asset
  await optIntoAsset(creator, assetID);

  //opt into asset
  const txn1 = [
    {
      method: getMethodByName("optintoasset"),
      ...commonParams,
      appForeignAssets: [assetID],
    },
  ];
  await makeATCCall(txn1);
  // transfer NFT
  const txn2 = [
    {
      method: getMethodByName("sendasatobuyer"),
      ...commonParams,
      appForeignAssets: [assetID],
    },
  ];

  await makeATCCall([txn2]);
})();
