// pages/api/sendHbar.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import { TransferTransaction, Hbar, AccountId } from '@hashgraph/sdk';

// Define the structure of the request body
type SendHbarRequestBody = {
  recipientAccountId: string;
  amount: number; // Amount in HBAR
  memo?: string;
};

// Define the structure of our successful response
type SendHbarResponse = {
  transactionId: string;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendHbarResponse | { error: string }>
) {
  // Use POST for actions that change state
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { recipientAccountId, amount, memo }: SendHbarRequestBody = req.body;

  // --- Input Validation ---
  if (!recipientAccountId || typeof recipientAccountId !== 'string') {
    return res.status(400).json({ error: 'recipientAccountId is required in the request body.' });
  }
  if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'A positive amount is required in the request body.' });
  }
  // --- End Validation ---

  try {
    const senderAccountId = process.env.HEDERA_ACCOUNT_ID;
    if (!senderAccountId) {
      throw new Error("HEDERA_ACCOUNT_ID is not set in environment variables.");
    }

    console.log(`Attempting to send ${amount} HBAR from ${senderAccountId} to ${recipientAccountId}`);

    // Create the transfer transaction
    const transaction = new TransferTransaction()
      .addHbarTransfer(senderAccountId, Hbar.from(amount).negated()) // Debit from sender
      .addHbarTransfer(recipientAccountId, Hbar.from(amount)) // Credit to recipient
      .setTransactionMemo(memo || 'Sent via HederaAI Co-Pilot');

    // Sign the transaction with the client operator private key and submit to the network
    const txResponse = await transaction.execute(hederaClient);

    // Request the receipt of the transaction, which confirms it was successful
    const receipt = await txResponse.getReceipt(hederaClient);

    // Check the transaction status
    const transactionStatus = receipt.status.toString();
    if (transactionStatus !== 'SUCCESS') {
      throw new Error(`Transaction failed with status: ${transactionStatus}`);
    }

    const transactionId = txResponse.transactionId.toString();

    const responseData: SendHbarResponse = {
      transactionId: transactionId,
      message: `Successfully sent ${amount} HBAR to ${recipientAccountId}.`,
    };
    
    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error(`Error sending HBAR:`, error);
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to send HBAR. Reason: ${errorMessage}` });
  }
}
