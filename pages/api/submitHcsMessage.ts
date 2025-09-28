// pages/api/submitHcsMessage.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import { TopicMessageSubmitTransaction, TopicId } from '@hashgraph/sdk';

// Define the structure of the request body
type SubmitMessageRequestBody = {
  topicId: string;
  message: string;
};

// Define the structure of our successful response
type SubmitMessageResponse = {
  transactionId: string;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitMessageResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { topicId, message }: SubmitMessageRequestBody = req.body;

  // --- Input Validation ---
  if (!topicId || !message) {
    return res.status(400).json({ error: 'topicId and message are required in the request body.' });
  }
  if (typeof message !== 'string' || message.length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }
  // --- End Validation ---

  try {
    console.log(`Submitting message "${message}" to HCS topic ${topicId}`);

    // Create the transaction to submit a message to the specified topic
    const transaction = new TopicMessageSubmitTransaction({
      topicId: TopicId.fromString(topicId),
      message: message,
    });

    // The client operator pays for and signs the transaction
    const txResponse = await transaction.execute(hederaClient);

    // Get the receipt to confirm the message was submitted successfully
    const receipt = await txResponse.getReceipt(hederaClient);

    const transactionStatus = receipt.status.toString();
    if (transactionStatus !== 'SUCCESS') {
      throw new Error(`Message submission failed with status: ${transactionStatus}`);
    }

    const responseData: SubmitMessageResponse = {
      transactionId: txResponse.transactionId.toString(),
      message: `Successfully submitted message to topic ${topicId}.`,
    };

    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Error submitting HCS message:', error);
    if (error.message && error.message.includes('INVALID_TOPIC_ID')) {
        return res.status(404).json({ error: `Topic with ID ${topicId} was not found.` });
    }
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to submit message. Reason: ${errorMessage}` });
  }
}