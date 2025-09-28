// pages/api/sendToken.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import { TransferTransaction, TokenId, AccountId } from '@hashgraph/sdk';

// Define the structure of the request body
type SendTokenRequestBody = {
  tokenId: string;
  recipientAccountId: string;
  amount: number; // The raw amount, not adjusted for decimals
};

// Define the structure of our successful response
type SendTokenResponse = {
  transactionId: string;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendTokenResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { tokenId, recipientAccountId, amount }: SendTokenRequestBody = req.body;

  // --- Input Validation ---
  if (!tokenId || !recipientAccountId || amount === undefined) {
    return res.status(400).json({ error: 'tokenId, recipientAccountId, and amount are required.' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'A positive amount is required.' });
  }
  // --- End Validation ---

  try {
    const senderAccountId = process.env.HEDERA_ACCOUNT_ID;
    if (!senderAccountId) {
      throw new Error("HEDERA_ACCOUNT_ID is not set in environment variables.");
    }

    console.log(`Attempting to send ${amount} of token ${tokenId} to ${recipientAccountId}`);

    // Create the token transfer transaction
    const transaction = new TransferTransaction()
      // Note: The amount must be adjusted for the token's decimals.
      // For this example, we assume the user provides the raw amount.
      // A production app should fetch token info to get decimals.
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(senderAccountId), -amount) // Debit from sender
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(recipientAccountId), amount) // Credit to recipient
      .freezeWith(hederaClient);
      
    // The client operator (sender) automatically signs this
    const txResponse = await transaction.execute(hederaClient);

    // Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(hederaClient);

    const transactionStatus = receipt.status.toString();
    if (transactionStatus !== 'SUCCESS') {
      throw new Error(`Token transfer failed with status: ${transactionStatus}`);
    }

    const responseData: SendTokenResponse = {
      transactionId: txResponse.transactionId.toString(),
      message: `Successfully sent ${amount} of token ${tokenId} to ${recipientAccountId}.`,
    };

    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Error sending token:', error);
    // Handle common errors, e.g., recipient not associated
    if (error.message && error.message.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
        return res.status(400).json({ error: 'The recipient account has not associated with this token.' });
    }
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to send token. Reason: ${errorMessage}` });
  }
}