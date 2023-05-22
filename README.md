[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-718a45dd9cf7e7f842a935f5ebbe5719a5e09af4491e668f4dbf3b35d5cca122.svg)](https://classroom.github.com/online_ide?assignment_repo_id=11199917&assignment_repo_type=AssignmentRepo)
# Vault Developer Assessment
In this assessment, complete the Dapp create and manage their vault. The vault is a smart contract that allows owners to store and transfer ASAs inside.

## Vault Smart Contract

### Features
The vault smart contract `assets/VaultApp.py` should have the following features,

#### Owner Management
1. Store the owner's address. This address can only be changed by the owner itself.

#### Store ASAs and Algos
1. Vaults can store ASAs and Algos.

#### Transfer ASAs and Algos
1. Only vault owners can transfer ASAs to/from the vault.
2. When transferring ASAs to vault, it must include a payment transaction to cover the minimum balance requirement (MBR) of the vault.
3. When transferring ASAs from the vault, allow vault owners to decide if they want to close out the ASAs or not.
4. The min balance (0.1 Algos) should be transferred back to the vault owner when ASAs are closed out.

### Other Requirements

#### Basic checks
`rekey to`, `close remainder to`, `asset close to` addresses are not found in the transactions.

#### ABI Compliance
All contracts are required to follow [ARC4](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0004.md) standards.

## Application Frontend
Complete the necessary codes in the src folder so that the vault owner can do the following,

1. Display vault contents (Algos and Assets)
2. Send ASAs from the vault to other accounts. Include option close out asset as well.
3. Transfer ASAs to the vault

## Testing
Write test cases to cover the successful contract deployment, as well as negative tests. Testing should be done on `SandNet`.

Your contracts should cover at least the following positive tests.

- Deploy vault app
- Change owner address
- Vault owner can send ASAs to vault
- Vault owner can send ASAs from the vault to other accounts
- Vault owner can close out asset for the vault to other accounts

Your contracts should cover at least the following negative tests.

- Non owner cannot change owner address
- Non owner cannot send ASAs to the vault
- Non owner cannot transfer ASAs from the vault
- Non owner cannot close out ASAs from the vault

## Setup instructions

### 1. Bootstrap Algokit
Run `algokit bootstrap`

### 2. Install Packages
Run `yarn install`

### 3. Run virtual env
Run `poetry shell`

### 4. Update environement variables
1. Copy `.env.example` to `.env.local`.
2. Update credentials in `.env.local` file.

### 5. Compile Contracts
Run `python assets/<filename>`

### 6. Deploy
Run `node scripts/deploy.js`

### 7. Run tests
Run `yarn test` (shortcut to run mocha tests)