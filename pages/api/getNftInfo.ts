// pages/api/getNftInfo.ts

import type { NextApiRequest, NextApiResponse } from 'next';

// Define a simplified structure for the NFT info we expect from the Mirror Node
type NftInfo = {
  account_id: string; // Current owner
  created_timestamp: string;
  deleted: boolean;
  metadata: string; // Base64 encoded metadata
  serial_number: number;
  token_id: string;
};

// The base URL for the Hedera Testnet Mirror Node REST API
const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NftInfo | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Example: /api/getNftInfo?collectionId=0.0.12345&serialNumber=1
  const { collectionId, serialNumber } = req.query;

  if (!collectionId || typeof collectionId !== 'string' || !serialNumber || typeof serialNumber !== 'string') {
    return res.status(400).json({ error: 'collectionId and serialNumber query parameters are required.' });
  }

  try {
    // Construct the URL to query the Mirror Node for specific NFT information
    const queryUrl = `${MIRROR_NODE_URL}/api/v1/tokens/${collectionId}/nfts/${serialNumber}`;
    
    console.log(`Querying Mirror Node for NFT info: ${queryUrl}`);

    const response = await fetch(queryUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`NFT with serial ${serialNumber} in collection ${collectionId} was not found.`);
      }
      const errorData = await response.json();
      throw new Error(errorData.status?.messages[0]?.message || 'Failed to fetch from Mirror Node');
    }

    const data: NftInfo = await response.json();

    // The metadata from the mirror node is base64 encoded. Let's decode it for readability.
    const decodedMetadata = Buffer.from(data.metadata, 'base64').toString('utf-8');

    const responseData = {
      ...data,
      metadata: decodedMetadata, // Replace with the decoded version
    };

    res.status(200).json(responseData);

  } catch (error: any) {
    console.error(`Error fetching info for NFT ${collectionId}/${serialNumber}:`, error);
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to fetch NFT info. Reason: ${errorMessage}` });
  }
}