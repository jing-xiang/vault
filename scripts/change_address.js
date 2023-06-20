import algosdk from "algosdk";
import {
  makeATCCall,
  optIntoApp,
  optIntoAsset,
  readLocalState,
  readGlobalState,
} from "./index.js";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });
import * as algotxn from "./index.js";

const algodClient = new algosdk.Algodv2(
  process.env.NEXT_PUBLIC_ALGOD_TOKEN,
  process.env.NEXT_PUBLIC_ALGOD_ADDRESS,
  process.env.NEXT_PUBLIC_ALGOD_PORT
);

(async () => {
  const appID = Number(process.env.NEXT_PUBLIC_APP_ID);
  console.log("App ID is: ", appID);
  const creator = algosdk.mnemonicToSecretKey(
    process.env.NEXT_PUBLIC_DEPLOYER_MNEMONIC
  );
  const alt = algosdk.mnemonicToSecretKey(process.env.NEXT_PUBLIC_ALT_MNEMONIC);
  const suggestedParams = await algodClient.getTransactionParams().do();

  const commonParams = {
    appID,
    sender: creator.addr,
    suggestedParams,
    signer: algosdk.makeBasicAccountTransactionSigner(creator),
  };

  //update owner address
  const txn = [
    {
      method: algotxn.getMethod("update_owner"),
      appAccounts: [alt.addr],
      ...commonParams,
    },
  ];
  console.log(txn);

  await makeATCCall(txn);
  console.log("Address changed!");
  const appGS = await readGlobalState(appID);
  console.log(appGS);
})();
