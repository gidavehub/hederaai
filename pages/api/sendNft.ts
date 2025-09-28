// pages/api/sendNft.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import {
  TransferTransaction,
  TokenId,
  AccountId,
  NftId,
} from '@hashgraph/sdk';

// Define the structure of the request body
type SendNftRequestBody = {
  collectionId: string;
  serialNumber: number;
  recipientAccountId: string;
};

// Define the structure of our successful response
type SendNftResponse = {
  transactionId: string;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendNftResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { collectionId, serialNumber, recipientAccountId }: SendNftRequestBody = req.body;

  // --- Input Validation ---
  if (!collectionId || serialNumber === undefined || !recipientAccountId) {
    return res.status(400).json({ error: 'collectionId, serialNumber, and recipientAccountId are required.' });
  }
  if (typeof serialNumber !== 'number' || serialNumber <= 0) {
    return res.status(400).json({ error: 'serialNumber must be a positive integer.' });
  }
  // --- End Validation ---

  try {
    const senderAccountId = process.env.HEDERA_ACCOUNT_ID;
    if (!senderAccountId) {
      throw new Error("HEDERA_ACCOUNT_ID is not set in environment variables.");
    }

    const nftId = new NftId(TokenId.fromString(collectionId), serialNumber);
    
    console.log(`Attempting to send NFT ${nftId.toString()} to ${recipientAccountId}`);

    // Create the NFT transfer transaction
    const transaction = new TransferTransaction()
      .addNftTransfer(
        nftId.tokenId,
        nftId.serial,
        AccountId.fromString(senderAccountId),
        AccountId.fromString(recipientAccountId)
      )
      .freezeWith(hederaClient);

    // The client operator (sender) automatically signs this
    const txResponse = await transaction.execute(hederaClient);

    // Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(hederaClient);

    const transactionStatus = receipt.status.toString();
    if (transactionStatus !== 'SUCCESS') {
      throw new Error(`NFT transfer failed with status: ${transactionStatus}`);
    }

    const responseData: SendNftResponse = {
      transactionId: txResponse.transactionId.toString(),
      message: `Successfully sent NFT ${nftId.toString()} to ${recipientAccountId}.`,
    };

    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any)
  {
    console.error('Error sending NFT:', error);
    // Handle common errors
    if (error.message && error.message.includes('SENDER_DOES_NOT_OWN_NFT_SERIAL_NO')) {
      return res.status(403).json({ error: 'The sender account does not own this NFT.' });
    }
    if (error.message && error.message.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
      return res.status(400).json({ error: 'The recipient account has not associated with this NFT collection.' });
    }
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to send NFT. Reason: ${errorMessage}` });
  }
}