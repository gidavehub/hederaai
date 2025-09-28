// pages/api/createAccount.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import {
  AccountCreateTransaction,
  PrivateKey,
  Hbar,
  PublicKey,
} from '@hashgraph/sdk';

// Define the structure of the request body
type CreateAccountRequestBody = {
  initialBalance?: number; // in HBAR
};

// Define the structure of our successful response
type CreateAccountResponse = {
  accountId: string;
  publicKey: string;
  privateKey: string; // WARNING: For testing/hackathon purposes only.
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateAccountResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { initialBalance = 10 }: CreateAccountRequestBody = req.body; // Default to 10 HBAR

  try {
    console.log(`Attempting to create a new account with an initial balance of ${initialBalance} HBAR.`);

    // 1. Generate a new cryptographic key pair
    const newAccountPrivateKey = PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    // 2. Create the transaction to create the new account
    const transaction = new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(new Hbar(initialBalance));

    // 3. Execute the transaction with the client operator
    const txResponse = await transaction.execute(hederaClient);

    // 4. Get the receipt to retrieve the new account ID
    const receipt = await txResponse.getReceipt(hederaClient);
    
    const newAccountId = receipt.accountId;
    if (!newAccountId) {
      throw new Error("New Account ID was not returned from the receipt.");
    }

    const responseData: CreateAccountResponse = {
      accountId: newAccountId.toString(),
      publicKey: newAccountPublicKey.toStringRaw(),
      // Returning the private key is necessary for the user to be able to control their new account.
      // Emphasize that this key must be saved securely and immediately.
      privateKey: newAccountPrivateKey.toStringRaw(),
      message: `Successfully created new account ${newAccountId.toString()}. SAVE THE PRIVATE KEY SECURELY!`,
    };

    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Error creating new account:', error);
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to create account. Reason: ${errorMessage}` });
  }
}