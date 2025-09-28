// pages/api/mintNft.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import {
  TokenMintTransaction,
  TokenId,
  PrivateKey,
  NftId,
} from '@hashgraph/sdk';

// Define the structure of the request body
type MintNftRequestBody = {
  collectionId: string;
  supplyKey: string; // The private key (in raw hex format) that can mint
  metadata: string; // Typically an IPFS CID, e.g., "ipfs://QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR"
};

// Define the structure of our successful response
type MintNftResponse = {
  transactionId: string;
  serialNumbers: number[];
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MintNftResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { collectionId, supplyKey, metadata }: MintNftRequestBody = req.body;

  // --- Input Validation ---
  if (!collectionId || !supplyKey || !metadata) {
    return res.status(400).json({ error: 'collectionId, supplyKey, and metadata are required.' });
  }
  // --- End Validation ---

  try {
    // Recreate the supply key from the raw string provided
    const supplyKeyInstance = PrivateKey.fromString(supplyKey);

    console.log(`Attempting to mint NFT into collection ${collectionId}`);

    // Convert the metadata string into a Buffer for the transaction
    const metadataBuffer = Buffer.from(metadata);

    // Create the minting transaction
    // Can mint up to 10 NFTs at once with different metadata
    const transaction = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(collectionId))
      .addMetadata(metadataBuffer)
      .freezeWith(hederaClient);
      
    // The transaction must be signed by the supply key
    const signTx = await transaction.sign(supplyKeyInstance);
    
    const txResponse = await signTx.execute(hederaClient);
    const receipt = await txResponse.getReceipt(hederaClient);

    // The receipt contains the serial number(s) of the newly minted NFT(s)
    const serialNumbers = receipt.serials.map(serial => serial.toNumber());
    
    if (serialNumbers.length === 0) {
        throw new Error("Minting was successful, but no serial numbers were returned.");
    }
    
    const newNftId = new NftId(TokenId.fromString(collectionId), serialNumbers[0]);

    const responseData: MintNftResponse = {
      transactionId: txResponse.transactionId.toString(),
      serialNumbers: serialNumbers,
      message: `Successfully minted NFT(s) with serial(s) ${serialNumbers.join(', ')}. New NFT ID: ${newNftId.toString()}`,
    };

    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Error minting NFT:', error);
    // Handle common errors
    if (error.status && error.status.toString() === 'INVALID_SIGNATURE') {
        return res.status(401).json({ error: 'The provided supplyKey is invalid or does not have minting authority for this collection.' });
    }
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to mint NFT. Reason: ${errorMessage}` });
  }
}