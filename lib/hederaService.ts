// lib/hederaService.ts

import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";

// Validate that environment variables are set
if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
    throw new Error("Hedera environment variables HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set");
}

const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
const privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);

// Create a configured client for the Hedera Testnet
const hederaClient = Client.forTestnet();

// Set the operator, which pays for transactions and queries
hederaClient.setOperator(accountId, privateKey);

export default hederaClient;