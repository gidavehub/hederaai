// pages/api/getTopicMessages.ts

import type { NextApiRequest, NextApiResponse } from 'next';

// Define the structure of a single message from the Mirror Node
type TopicMessage = {
  consensus_timestamp: string;
  message: string; // Base64 encoded message
  sequence_number: number;
  running_hash: string;
};

// Define the structure of our successful response
type TopicMessagesResponse = {
  messages: {
    consensus_timestamp: string;
    message: string; // Decoded message
    sequence_number: number;
  }[];
  next_link: string | null;
};

// The base URL for the Hedera Testnet Mirror Node REST API
const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TopicMessagesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Example: /api/getTopicMessages?topicId=0.0.12345
  const { topicId } = req.query;

  if (!topicId || typeof topicId !== 'string') {
    return res.status(400).json({ error: 'topicId query parameter is required.' });
  }

  try {
    // Construct the URL to query the Mirror Node for topic messages
    const queryUrl = `${MIRROR_NODE_URL}/api/v1/topics/${topicId}/messages`;
    
    console.log(`Querying Mirror Node for messages in topic ${topicId}`);

    const response = await fetch(queryUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Topic with ID ${topicId} was not found.`);
      }
      const errorData = await response.json();
      throw new Error(errorData.status?.messages[0]?.message || 'Failed to fetch from Mirror Node');
    }

    const data: { messages: TopicMessage[], links: { next: string | null } } = await response.json();

    // Decode the base64 messages for the response
    const decodedMessages = data.messages.map(msg => ({
      consensus_timestamp: msg.consensus_timestamp,
      message: Buffer.from(msg.message, 'base64').toString('utf-8'),
      sequence_number: msg.sequence_number,
    }));

    const responseData: TopicMessagesResponse = {
      messages: decodedMessages,
      next_link: data.links?.next || null,
    };

    res.status(200).json(responseData);

  } catch (error: any) {
    console.error(`Error fetching messages for topic ${topicId}:`, error);
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to fetch topic messages. Reason: ${errorMessage}` });
  }
}