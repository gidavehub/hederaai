// pages/api/createToken.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  PrivateKey,
  Hbar,
} from '@hashgraph/sdk';

// Define the structure of the request body
type CreateTokenRequestBody = {
  tokenName: string;
  tokenSymbol: string;
  initialSupply: number;
  decimals?: number;
  memo?: string;
};

// Define the structure of our successful response
type CreateTokenResponse = {
  transactionId: string;
  tokenId: string;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateTokenResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { tokenName, tokenSymbol, initialSupply, decimals = 0, memo }: CreateTokenRequestBody = req.body;

  // --- Input Validation ---
  if (!tokenName || !tokenSymbol || initialSupply === undefined) {
    return res.status(400).json({ error: 'tokenName, tokenSymbol, and initialSupply are required.' });
  }
  if (typeof initialSupply !== 'number' || initialSupply < 0) {
    return res.status(400).json({ error: 'initialSupply must be a non-negative number.' });
  }
  // --- End Validation ---

  try {
    const treasuryAccountId = process.env.HEDERA_ACCOUNT_ID;
    if (!treasuryAccountId) {
      throw new Error("HEDERA_ACCOUNT_ID is not set in environment variables.");
    }
    
    console.log(`Creating new token "${tokenName}" (${tokenSymbol}) with initial supply of ${initialSupply}.`);

    // For simplicity in this API, we will generate new keys for the token.
    // In a real application, you might want to manage these keys more securely.
    const adminKey = PrivateKey.generateED25519();
    const kycKey = PrivateKey.generateED25519();
    const freezeKey = PrivateKey.generateED25519();
    const wipeKey = PrivateKey.generateED25519();
    const supplyKey = PrivateKey.generateED25519();

    // Create the token creation transaction
    const transaction = new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(decimals)
      .setInitialSupply(initialSupply * Math.pow(10, decimals)) // Adjust supply for decimals
      .setTreasuryAccountId(treasuryAccountId) // The account that will receive the initial supply
      .setSupplyType(TokenSupplyType.Infinite) // Can be Infinite or Finite
      .setAdminKey(adminKey.publicKey)
      .setKycKey(kycKey.publicKey)
      .setFreezeKey(freezeKey.publicKey)
      .setWipeKey(wipeKey.publicKey)
      .setSupplyKey(supplyKey.publicKey)
      .setTokenMemo(memo || `Token for ${tokenName}`)
      .setMaxTransactionFee(new Hbar(30)); // Set a higher max fee for token creation

    // Sign the transaction with the treasury account's private key
    // In this setup, hederaClient's operator is the treasury, so it signs automatically.
    // For more complex setups, you'd also sign with the adminKey.
    const signedTx = await transaction.signWithOperator(hederaClient);
    
    // We must also sign with the admin key to authorize its use
    const finalTx = await signedTx.sign(adminKey);

    const txResponse = await finalTx.execute(hederaClient);
    const receipt = await txResponse.getReceipt(hederaClient);

    // Get the new token ID from the receipt
    const tokenId = receipt.tokenId;
    if (!tokenId) {
      throw new Error("Token ID was not returned from the receipt.");
    }

    const responseData: CreateTokenResponse = {
      transactionId: txResponse.transactionId.toString(),
      tokenId: tokenId.toString(),
      message: `Successfully created token ${tokenName} (${tokenId.toString()}).`,
    };

    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Error creating token:', error);
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to create token. Reason: ${errorMessage}` });
  }
}