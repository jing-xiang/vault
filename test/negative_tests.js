import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import algosdk from "algosdk";
import * as algotxn from "../scripts/index.js";
import { createAsset, signAndSubmit } from "../src/algorand/index.js";

// use chai-as-promise library
chai.use(chaiAsPromised);
const assert = chai.assert;
const expect = chai.expect;
const algodClient = new algosdk.Algodv2(
  process.env.NEXT_PUBLIC_ALGOD_TOKEN,
  process.env.NEXT_PUBLIC_ALGOD_ADDRESS,
  process.env.NEXT_PUBLIC_ALGOD_PORT
);

describe("Negative Tests", function () {
  let appID, appAddress, buyer, alt;
  const creator = algosdk.mnemonicToSecretKey(
    process.env.NEXT_PUBLIC_DEPLOYER_MNEMONIC
  );

  this.beforeEach(async () => {
    // deploy app
    buyer = algosdk.generateAccount();
    alt = algosdk.mnemonicToSecretKey(process.env.NEXT_PUBLIC_ALT_MNEMONIC);

    const { confirmation } = await algotxn.deployDemoApp(creator);
    appID = confirmation["application-index"];

    // fund contract and buyer with 1.1 Algos
    appAddress = algosdk.getApplicationAddress(appID);
    await algotxn.fundAccount(creator, appAddress, 1e6 + 1e5);

    await algotxn.fundAccount(creator, buyer.addr, 1e6 + 1e5);
  });

  it("Non owner cannot send ASAs to the vault", async () => {
    const assetID = await createAsset(buyer);
    const suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = 2 * algosdk.ALGORAND_MIN_TX_FEE;
    const commonParams = {
      appID,
      sender: buyer.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(buyer),
    };

    const txn = [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: buyer.addr,
          to: appAddress,
          amount: 100000,
          suggestedParams,
        }),
        signer: algosdk.makeBasicAccountTransactionSigner(buyer),
      },
      {
        method: algotxn.getMethod("optintoasset"),
        ...commonParams,
        appForeignAssets: [assetID],
      },
    ];
    await expect(algotxn.makeATCCall(txn)).to.be.rejectedWith(Error);

    let nfttxn = [
      await algotxn.createAssetTransferTxn(
        algodClient,
        buyer.addr,
        appAddress,
        parseInt(assetID),
        1
      ),
    ];

    await expect(signAndSubmit(algodClient, nfttxn, buyer)).to.be.rejectedWith(
      Error
    );
  });

  it("Non owner cannot transfer ASAs from the vault", async () => {
    const assetID = await createAsset(creator);
    const suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = 2 * algosdk.ALGORAND_MIN_TX_FEE;
    const commonParams = {
      appID,
      sender: creator.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(creator),
    };

    const txn = [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: creator.addr,
          to: appAddress,
          amount: 100000,
          suggestedParams,
        }),
        signer: algosdk.makeBasicAccountTransactionSigner(creator),
      },
      {
        method: algotxn.getMethod("optintoasset"),
        ...commonParams,
        appForeignAssets: [assetID],
      },
    ];
    await algotxn.makeATCCall(txn);

    let nfttxn = [
      await algotxn.createAssetTransferTxn(
        algodClient,
        creator.addr,
        appAddress,
        parseInt(assetID),
        1
      ),
    ];

    await signAndSubmit(algodClient, nfttxn, creator);

    await algotxn.optIntoAsset(alt, assetID);

    //transfer ASA
    const transferfromvault = [
      {
        method: algotxn.getMethod("transfer_asset"),
        appID,
        sender: buyer.addr,
        suggestedParams,
        signer: algosdk.makeBasicAccountTransactionSigner(buyer),
        appForeignAssets: [parseInt(assetID)],
        methodArgs: [parseInt(1)],
        appAccounts: [alt.addr],
      },
    ];
    //non owner cannot transfer asa from vault
    await expect(algotxn.makeATCCall(transferfromvault)).to.be.rejectedWith(
      Error
    );
  });

  it("Non owner cannot close out ASAs from the vault", async () => {
    const assetID = await createAsset(creator);
    const suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = 2 * algosdk.ALGORAND_MIN_TX_FEE;

    const commonParams = {
      appID,
      sender: creator.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(creator),
    };
    const grouptxn = [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: creator.addr,
          to: appAddress,
          amount: 100000,
          suggestedParams,
        }),
        signer: algosdk.makeBasicAccountTransactionSigner(creator),
      },
      {
        method: algotxn.getMethod("optintoasset"),
        ...commonParams,
        appForeignAssets: [assetID],
      },
    ];
    await algotxn.makeATCCall(grouptxn);

    let nfttxn = [
      await algotxn.createAssetTransferTxn(
        algodClient,
        creator.addr,
        appAddress,
        parseInt(assetID),
        1
      ),
    ];

    await signAndSubmit(algodClient, nfttxn, creator);
    const appInfo = await algotxn.accountInfo(appAddress);

    await algotxn.optIntoAsset(alt, assetID);

    const txn2 = [
      {
        method: algotxn.getMethod("close_asset"),
        appID,
        sender: buyer.addr,
        suggestedParams,
        signer: algosdk.makeBasicAccountTransactionSigner(buyer),
        appForeignAssets: [assetID],
        methodArgs: [parseInt(1)],
        appAccounts: [alt.addr],
      },
    ];
    //non owner cannot close out asa from vault
    await expect(algotxn.makeATCCall(txn2)).to.be.rejectedWith(Error);
  });

  it("Non owner cannot change owner address", async () => {
    const suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = 2 * algosdk.ALGORAND_MIN_TX_FEE;
    const commonParams = {
      appID,
      sender: buyer.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(buyer),
    };
    const txn = [
      {
        method: algotxn.getMethod("update_owner"),
        appAccounts: [alt.addr],
        ...commonParams,
      },
    ];
    //non owner cannot change owner address
    await expect(algotxn.makeATCCall(txn)).to.be.rejectedWith(Error);
  });
});
