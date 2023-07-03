from beaker import *
from pyteal import *

class VaultAppState:
    """
    Global States
    """
    #owner address
    owner = GlobalStateValue(
        stack_type=TealType.bytes,
        key=Bytes("OwnerAddress"),
        default=Bytes(""),
        descr="Vault owner's address",
    )

    
app = Application("VaultApp", state=VaultAppState())

@app.external(authorize=Authorize.only(app.state.owner.get()))
def update_owner(*,output: abi.String, ):
    Assert(basic_checks()),
    return Seq(
        Assert(Txn.sender() == app.state.owner.get()), 
        app.state.owner.set(Txn.accounts[1]),
        output.set("Updated global state!"),
    )   

@app.create(bare=True)
def create():
    on_create = Seq([
        app.initialize_global_state(),
        app.state.owner.set(Txn.sender()),
    ])
    return on_create

@Subroutine(TealType.uint64)
def basic_checks():
    return And(
        Txn.rekey_to() == Global.zero_address(),
        Txn.close_remainder_to() == Global.zero_address(),
        Txn.asset_close_to() == Global.zero_address(),
    )

#contract opts in to asset
@app.external(authorize=Authorize.only(app.state.owner.get()))
def optintoasset(*, output: abi.String):
    close = Seq([
        Assert(basic_checks()),
        Assert(Txn.sender() == app.state.owner.get()),  
        Assert(Gtxn[0].amount() == Int(100000)),
    ])
    
    on_close = Seq([
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],  # ASA index
                TxnField.asset_receiver: Global.current_application_address(),
                TxnField.asset_amount: Int(0),
                TxnField.fee: Int(0),
            }
        ),
        InnerTxnBuilder.Submit(),
        output.set("ASA Opted in!")
    ])
    
    return Seq([close, on_close])

#transfer asset without closing out
@app.external(authorize=Authorize.only(app.state.owner.get()))
def transfer_asset(amount: abi.Uint64,*, output: abi.String):
    contractassetbalance = AssetHolding.balance(Global.current_application_address(), Txn.assets[0])
    receiverassetbalance = AssetHolding.balance(Txn.accounts[1], Txn.assets[0])
    return Seq(
        contractassetbalance,
        Assert(contractassetbalance.value() >= amount.get()),
        receiverassetbalance,
        Assert(receiverassetbalance.hasValue()),
        Assert(basic_checks()),
        Assert(Txn.sender() == app.state.owner.get()),
        # Transfer Asset
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],  # first foreign asset
                TxnField.asset_receiver: Txn.accounts[1],
                TxnField.asset_amount: amount.get(),
                TxnField.fee: Int(0),
            }
        ),
        InnerTxnBuilder.Submit(),
        output.set("ASA transferred!"),
    )

#transfer asset and close out
@app.external(authorize=Authorize.only(app.state.owner.get()))
def close_asset(amount:abi.Uint64, *, output: abi.String):
    receiverassetbalance = AssetHolding.balance(Txn.accounts[1], Txn.assets[0])
    contractassetbalance = AssetHolding.balance(Global.current_application_address(), Txn.assets[0])
    return Seq(
        Assert(basic_checks()),
        receiverassetbalance,
        Assert(receiverassetbalance.hasValue()),
        contractassetbalance,
        Assert(contractassetbalance.value() == amount.get()),
        Assert(Txn.sender() == app.state.owner.get()),
        # Transfer Asset
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],  # first foreign asset
                TxnField.asset_receiver: Txn.accounts[1],
                TxnField.asset_close_to: Txn.accounts[1],
                TxnField.asset_amount: amount.get(),
                TxnField.fee: Int(0),
            }
        ),
        InnerTxnBuilder.Submit(),
        # Transfer algos back to deployer
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.Payment,
                TxnField.amount: Int(100000),  #MBR
                TxnField.receiver: app.state.owner.get(),
                TxnField.fee: Int(0),
            }
        ),
        InnerTxnBuilder.Submit(),
        output.set("ASA transferred and closed out!"),
    )

APP_NAME = "VaultApp"

if __name__ == "__main__":
    app.build().export(f"assets/artifacts/{APP_NAME}")
