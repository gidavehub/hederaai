// pages/api/createNftCollection.ts

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
type CreateNftRequestBody = {
  collectionName: string;
  collectionSymbol: string;
  memo?: string;
};

// Define the structure of our successful response
type CreateNftResponse = {
  transactionId: string;
  collectionId: string; // This is a Token ID
  supplyKey: string; // The private key needed to mint NFTs later
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateNftResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { collectionName, collectionSymbol, memo }: CreateNftRequestBody = req.body;

  // --- Input Validation ---
  if (!collectionName || !collectionSymbol) {
    return res.status(400).json({ error: 'collectionName and collectionSymbol are required.' });
  }
  // --- End Validation ---

  try {
    const treasuryAccountId = process.env.HEDERA_ACCOUNT_ID;
    if (!treasuryAccountId) {
      throw new Error("HEDERA_ACCOUNT_ID is not set in environment variables.");
    }

    console.log(`Creating new NFT Collection "${collectionName}" (${collectionSymbol}).`);

    // The Supply Key is crucial for NFTs as it controls the minting of new tokens in the collection.
    const supplyKey = PrivateKey.generateED25519();
    const adminKey = PrivateKey.generateED25519(); // Optional, for managing the collection itself

    const transaction = new TokenCreateTransaction()
      .setTokenName(collectionName)
      .setTokenSymbol(collectionSymbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(0) // NFTs must have 0 decimals
      .setInitialSupply(0) // NFTs are minted one by one, so initial supply is 0
      .setTreasuryAccountId(treasuryAccountId)
      .setSupplyType(TokenSupplyType.Finite) // Usually Finite for NFTs
      .setMaxSupply(2500) // Example: Set a max supply for the collection
      .setAdminKey(adminKey.publicKey)
      .setSupplyKey(supplyKey.publicKey) // This key will authorize future minting
      .setTokenMemo(memo || `NFT Collection for ${collectionName}`)
      .freezeWith(hederaClient);

    // The transaction must be signed by the treasury account and the new supply key
    const signTx = await transaction.sign(supplyKey);
    const txResponse = await signTx.execute(hederaClient);
    const receipt = await txResponse.getReceipt(hederaClient);

    const collectionId = receipt.tokenId;
    if (!collectionId) {
      throw new Error("Collection (Token) ID was not returned from the receipt.");
    }

    const responseData: CreateNftResponse = {
      transactionId: txResponse.transactionId.toString(),
      collectionId: collectionId.toString(),
      // IMPORTANT: The supply key must be saved securely by the client to be able to mint later.
      // Returning a private key in an API response is okay for a hackathon but a major security risk in production.
      supplyKey: supplyKey.toStringRaw(),
      message: `Successfully created NFT Collection ${collectionName} (${collectionId.toString()}). Save the supplyKey to mint NFTs.`,
    };

    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Error creating NFT collection:', error);
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to create NFT collection. Reason: ${errorMessage}` });
  }
}