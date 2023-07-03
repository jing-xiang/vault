import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import algosdk from "algosdk";
import * as algotxn from "../scripts/index.js";
import { createAsset, signAndSubmit } from "../src/algorand/index.js";

// use chai-as-promise library
chai.use(chaiAsPromised);
let assert = chai.assert;

let buyer;

const algodClient = new algosdk.Algodv2(
  process.env.NEXT_PUBLIC_ALGOD_TOKEN,
  process.env.NEXT_PUBLIC_ALGOD_ADDRESS,
  process.env.NEXT_PUBLIC_ALGOD_PORT
);

describe("Success Tests", function () {
  let appID, appAddress;
  const creator = algosdk.mnemonicToSecretKey(
    process.env.NEXT_PUBLIC_DEPLOYER_MNEMONIC
  );

  this.beforeEach(async () => {
    // deploy app
    buyer = algosdk.generateAccount();

    const { confirmation } = await algotxn.deployDemoApp(creator);
    appID = confirmation["application-index"];

    // fund contract and buyer
    appAddress = algosdk.getApplicationAddress(appID);
    await algotxn.fundAccount(creator, appAddress, 1e6 + 1e5);

    await algotxn.fundAccount(creator, buyer.addr, 1e6 + 1e5);
  });

  it("Deploys app successfully", async () => {
    const appGS = await algotxn.readGlobalState(appID);
    //verify app created
    assert.isDefined(appID);
    assert.equal(appGS.get("OwnerAddress"), creator.addr);
    //verify app funded
    const appAccount = await algotxn.accountInfo(appAddress);
    assert.equal(appAccount.amount, 1e6 + 1e5);
  });

  it("Owner deposits ASAs to vault successfully", async () => {
    const startInfo = await algotxn.accountInfo(appAddress);
    const start = startInfo.amount;
    const assetID = await createAsset(creator);
    const suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = 2 * algosdk.ALGORAND_MIN_TX_FEE;
    const commonParams = {
      appID,
      sender: creator.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(creator),
    };

    //meet mbr and contract opt into asset
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

    //transfer asset to vault
    let assettxn = [
      await algotxn.createAssetTransferTxn(
        algodClient,
        creator.addr,
        appAddress,
        parseInt(assetID),
        1
      ),
    ];

    await signAndSubmit(algodClient, assettxn, creator);
    const appInfo = await algotxn.accountInfo(appAddress);

    const finish = appInfo.amount;
    assert.equal(appInfo.assets[0].amount, 1);
    assert.equal(finish - start, 1e5);
  });

  it("Owner transfers ASAs out successfully", async () => {
    const assetID = await createAsset(creator);
    const suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = 2 * algosdk.ALGORAND_MIN_TX_FEE;
    const commonParams = {
      appID,
      sender: creator.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(creator),
    };

    //meet mbr and contract opt into asset
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
    await algotxn.optIntoAsset(buyer, assetID);

    //transfer ASA
    const txn = [
      {
        method: algotxn.getMethod("transfer_asset"),
        ...commonParams,
        appForeignAssets: [parseInt(assetID)],
        methodArgs: [parseInt(1)],
        appAccounts: [buyer.addr],
      },
    ];
    const res = await algotxn.makeATCCall(txn);

    const buyerInfo = await algotxn.accountInfo(buyer.addr);

    //check asset balances
    const updatedAppInfo = await algotxn.accountInfo(appAddress);
    assert.equal(updatedAppInfo.assets[0].amount, 0);
    assert.equal(buyerInfo.assets[0].amount, 1);
  });

  it("Owner closes out asset successfully", async () => {
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
    const initial = appInfo.amount;
    await algotxn.optIntoAsset(buyer, assetID);

    const txn2 = [
      {
        method: algotxn.getMethod("close_asset"),
        ...commonParams,
        appForeignAssets: [assetID],
        methodArgs: [parseInt(1)],
        appAccounts: [buyer.addr],
      },
    ];
    const res = await algotxn.makeATCCall(txn2);

    const buyerInfo = await algotxn.accountInfo(buyer.addr);

    const updatedAppInfo = await algotxn.accountInfo(appAddress);

    //check if asset has been completely removed
    assert.equal(updatedAppInfo.assets.length, 0);
    assert.equal(buyerInfo.assets[0].amount, 1);

    const finalAppInfo = await algotxn.accountInfo(appAddress);
    const final = finalAppInfo.amount;
    assert.equal(final - initial, -1e5);
  });

  it("Owner changes owner address successfully", async () => {
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
        method: algotxn.getMethod("update_owner"),
        appAccounts: [buyer.addr],
        ...commonParams,
      },
    ];
    await algotxn.makeATCCall(txn);
    const appGS = await algotxn.readGlobalState(appID);
    //assert that new owner is the buyer
    assert.equal(appGS.get("OwnerAddress"), buyer.addr);
  });
});
