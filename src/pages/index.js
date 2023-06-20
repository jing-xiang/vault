import Head from "next/head";
import styles from "@/styles/Home.module.css";
import Navbar from "@/components/Navbar";
import SendFromVaultForm from "@/components/SendFromVaultForm";
import SendToVaultForm from "@/components/SendtoVaultForm";
import { useEffect, useState } from "react";
import { getAlgodClient } from "../clients";
import { useWallet } from "@txnlab/use-wallet";
import algosdk, { decodeUint64, getMethodByName } from "algosdk";
import common from "mocha/lib/interfaces/common";
import * as algotxn from "@/algorand";
import ASA from "@/components/ASA";

const network = process.env.NEXT_PUBLIC_NETWORK || "SandNet";
const algodClient = getAlgodClient(network);

// get app ID
const appID = parseInt(process.env.NEXT_PUBLIC_APP_ID);
console.log("App ID is: ", appID);
const appAddress = algosdk.getApplicationAddress(appID);
console.log(appAddress);

const suggestedParams = await algodClient.getTransactionParams().do();
suggestedParams.fee = 2 * algosdk.ALGORAND_MIN_TX_FEE;

export default function Home() {
  const [vaultAssets, setVaultAssets] = useState([]);
  const [vaultAlgos, setVaultAlgos] = useState(0);
  const [txnref, setTxnRef] = useState("");
  const [txnUrl, setTxnUrl] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const {
    activeAddress,
    activeAccount,
    signTransactions,
    sendTransactions,
    signer,
  } = useWallet();

  const commonParams = {
    appID,
    sender: activeAddress,
    suggestedParams,
    signer,
  };
  const loadVaultAssets = async () => {
    //code to load vault assets
    const assetlist = await algotxn.fetchASA(algodClient);
    setVaultAssets(assetlist);
  };

  const loadVaultAlgos = async () => {
    const accountinformation = await algotxn.accountInfo(appAddress);
    const algos = accountinformation["amount"];
    console.log(accountinformation);
    setVaultAlgos(algos);
  };

  useEffect(() => {
    // fetch vault contract details here

    loadVaultAssets();
    loadVaultAlgos();
    // determine if activeAccount is vault owner
    if (activeAddress === process.env.NEXT_PUBLIC_DEPLOYER_ADDR) {
      setIsOwner(true);
    } else {
      setIsOwner(false);
    }
  }, [activeAddress]);

  const getTxnRefUrl = (txId) => {
    if (network === "SandNet") {
      return `https://app.dappflow.org/explorer/transaction/${txId}`;
    } else if (network === "TestNet") {
      return `https://testnet.algoexplorer.io/tx/${txId}`;
    }

    return "";
  };

  const handleSendFromVault = async (
    assetId,
    receiver,
    closeOutAsset,
    amount
  ) => {
    // add logic to send asset from the vault
    console.log(assetId, receiver, closeOutAsset, amount);
    // payment 1 txn
    const appAddress = algosdk.getApplicationAddress(appID);
    const accountinformation = await algotxn.accountInfo(appAddress);
    console.log(accountinformation);

    try {
      //transfer ASA and closeout
      if (closeOutAsset) {
        const txn2 = [
          {
            method: algotxn.getMethod("close_asset"),
            ...commonParams,
            appForeignAssets: [assetId],
            methodArgs: [parseInt(amount)],
            appAccounts: [receiver],
          },
        ];
        await algotxn.makeATCCall(txn2);
      }

      // transfer ASA
      else {
        const txn3 = [
          {
            method: algotxn.getMethod("transfer_asset"),
            ...commonParams,
            appForeignAssets: [assetId],
            methodArgs: [parseInt(amount)],
            appAccounts: [receiver],
          },
        ];
        await algotxn.makeATCCall(txn3);
      }

      //display txn id and url
      // setTxnRef(res.txId);
      // setTxnUrl(getTxnRefUrl(res.txId));
      loadVaultAlgos();
      loadVaultAssets();
    } catch (error) {
      //console.error("Restricted accesss.");
      console.error(error);
      alert("Receiver not opted in to asset or invalid amount.");
    }
  };

  const handleSendToVault = async (assetId, amount) => {
    // add logic to send asset to the vault
    console.log(amount);

    console.log(appAddress);
    try {
      const accountInfo = await algodClient
        .accountInformation(algosdk.getApplicationAddress(appID))
        .do();
      const hasOptedIn = accountInfo.assets.find(
        (x) => x["asset-id"] == assetId
      );
      if (!hasOptedIn) {
        const txn = [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              from: activeAddress,
              to: appAddress,
              amount: 100000,
              suggestedParams,
            }),
            signer: signer,
          },
          {
            method: algotxn.getMethod("optintoasset"),
            ...commonParams,
            appForeignAssets: [assetId],
          },
        ];
        await algotxn.makeATCCall(txn);
      }

      // proceed to transfer ASA
      let nfttxn = [
        await algotxn.createAssetTransferTxn(
          algodClient,
          activeAddress,
          appAddress,
          parseInt(assetId),
          Number(amount)
        ),
      ];
      console.log(nfttxn);
      const groupedTxn = algosdk.assignGroupID(nfttxn);

      // Sign
      const encodedTxns = groupedTxn.map((txn) =>
        algosdk.encodeUnsignedTransaction(txn)
      );
      const signedtxns = await signTransactions(encodedTxns);
      const res = await sendTransactions(signedtxns, 4);

      // print ASA info
      console.log(
        algodClient.accountAssetInformation(appAddress, assetId).do()
      );
      console.log(assetId);
      //display txn id and url
      setTxnRef(res.txId);
      setTxnUrl(getTxnRefUrl(res.txId));

      //refresh
      loadVaultAlgos();
      loadVaultAssets();
    } catch (error) {
      alert("Asset unavailable or invalid wallet");
    }
  };

  const onBuyASA = async (assetId) => {
    console.log(activeAddress);

    //Transaction - Buyer opts into the NFT
    const optInASATxn =
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        to: activeAddress,
        suggestedParams,
        assetIndex: assetId,
        amount: 0,
      });

    //sign and submit transaction for ASA opt in
    const payload = [optInASATxn];
    const groupedTxn = algosdk.assignGroupID(payload);
    const encodedTxns = groupedTxn.map((txn) =>
      algosdk.encodeUnsignedTransaction(txn)
    );
    const signed = await signTransactions(encodedTxns);
    const res = await sendTransactions(signed, 4);
    console.log(res);
  };

  return (
    <>
      <Head>
        <title>VaultApp</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Navbar />
      <main className={styles.main}>
        <div>
          <h1 className="text-5xl mb-4">Vault Dapp</h1>
          <h4 className="mb-4">Network: {network}</h4>
          <h4 className="mb-4">Application ID: {appID}</h4>
          <h4 className="mb-4">No. of vault assets: {vaultAssets.length}</h4>
          <h4 className="mb-4">Vault microAlgos: {vaultAlgos}</h4>
        </div>
        <div>
          {activeAddress && txnref && (
            <p className="mb-4 text-left">
              <a href={txnUrl} target="_blank" className="text-blue-500">
                Tx ID: {txnref}
              </a>
            </p>
          )}
          {activeAddress &&
            vaultAssets.map((item, index) => (
              <ASA
                key={index}
                src={item.imgUrl}
                metadata={item.metadata}
                assetId={item.asset["asset-id"]}
                onButtonClick={() => onBuyASA(item.asset["asset-id"])}
              />
            ))}
        </div>
        {isOwner && (
          <SendFromVaultForm
            assets={vaultAssets}
            onSendFromVault={handleSendFromVault}
          />
        )}
        {isOwner && <SendToVaultForm onSendToVault={handleSendToVault} />}
      </main>
    </>
  );
}
