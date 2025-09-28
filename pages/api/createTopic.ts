// pages/api/createTopic.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import { TopicCreateTransaction, PrivateKey } from '@hashgraph/sdk';

// Define the structure of the request body
type CreateTopicRequestBody = {
  memo?: string;
  // In a more advanced setup, you could pass a submitKey to make the topic private
};

// Define the structure of our successful response
type CreateTopicResponse = {
  transactionId: string;
  topicId: string;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateTopicResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { memo }: CreateTopicRequestBody = req.body;

  try {
    console.log(`Attempting to create a new HCS topic.`);

    // Create the transaction to create a new topic
    // By not setting a .setSubmitKey(), we make the topic public, allowing anyone to submit messages.
    // An admin key is still useful for managing the topic (e.g., updating its memo or deleting it).
    const adminKey = PrivateKey.generateED25519();

    const transaction = new TopicCreateTransaction()
      .setAdminKey(adminKey.publicKey)
      .setTopicMemo(memo || 'HCS Topic created by HederaAI');

    // The client operator pays for and signs the transaction
    const txResponse = await transaction.execute(hederaClient);
    
    // Get the receipt to retrieve the new topic ID
    const receipt = await txResponse.getReceipt(hederaClient);
    
    const topicId = receipt.topicId;
    if (!topicId) {
      throw new Error("Topic ID was not returned from the receipt.");
    }
    
    const responseData: CreateTopicResponse = {
      transactionId: txResponse.transactionId.toString(),
      topicId: topicId.toString(),
      message: `Successfully created a new public HCS topic with ID: ${topicId.toString()}`,
    };

    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Error creating HCS topic:', error);
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to create topic. Reason: ${errorMessage}` });
  }
}