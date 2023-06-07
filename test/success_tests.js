import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import algosdk, { decodeAddress } from "algosdk";
import * as algotxn from "../scripts/index.js";

// use chai-as-promise library
chai.use(chaiAsPromised);
let assert = chai.assert;

describe("Success Tests", function () {
  // write your code here
  let appID, appAddress;
  const creator = algosdk.mnemonicToSecretKey(
    process.env.NEXT_PUBLIC_DEPLOYER_ADDR
  );
  this.beforeEach(async () => {
    // deploy app
    const { confirmation } = await algotxn.deployDemoApp(creator);
    appID = confirmation["application-index"];

    // fund contract with 1.1 Algos
    appAddress = algosdk.getApplicationAddress(appID);
    await algotxn.fundAccount(creator, appAddress, 1e6 + 1e5);
  });

  it("Deploys app successfully", async () => {
    const appGS = await algotxn.readGlobalState(appID);
    // write your code here
    //verify app created
    assert.isDefined(appID);
    assert.equal(appGS.get("OwnerAddress"), decodeAddress(creator.addr));
    //verify app funded
    const appAccount = await algotxn.accountInfo(appAddress);
    assert.equal(appAccount.amount, 1e6 + 1e5);
  });

  it("Account opts in successfully", async () => {
    await algotxn.optIntoApp(player, appID);

    // verify local state initialized
    const appLS = await algotxn.readLocalState(creator.addr, appID);
    assert.equal(appLS.get("AssetBalances"), 0);
    assert.equal(appLS.get("microAlgoBalance"), 1100000);
  });

  it("Deposit ASA", async () => {
    // write your code here
  });

  it("", async () => {
    // write your code here
  });
});
