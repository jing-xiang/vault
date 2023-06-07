//import { readGlobalState } from "@/algorand";
import algosdk from "algosdk";
import { readGlobalState, readLocalState, optIntoApp, getMethodByName, makeATCCall } from "../src/algorand/index.js";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

const algodClient = new algosdk.Algodv2(
    process.env.NEXT_PUBLIC_ALGOD_TOKEN,
    process.env.NEXT_PUBLIC_ALGOD_ADDRESS,
    process.env.NEXT_PUBLIC_ALGOD_PORT
  );
  
  (async () => {
    const creator = algosdk.mnemonicToSecretKey(process.env.NEXT_PUBLIC_DEPLOYER_MNEMONIC);
  
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

  
    // Opt into app
    await optIntoApp(creator, appID);
    console.log("yeet");
    // update global and local state
    const txn1 = [
      {
        method: getMethodByName("update_global"),
        methodArgs: ["hi"],
        ...commonParams,
      },
    ];
  
    await makeATCCall(txn1);
  
    // update global and local state
    const txn2 = [
      {
        method: getMethodByName("update_local"),
        methodArgs: [123],
        ...commonParams,
      },
    ];
  
    await makeATCCall(txn2);
  
    // print global / local state info
    console.log(await readGlobalState(appID));
    console.log(await readLocalState(creator.addr, appID));
  })();


