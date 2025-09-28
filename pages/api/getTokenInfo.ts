// pages/api/getTokenInfo.ts

import type { NextApiRequest, NextApiResponse } from 'next';

// Define a simplified structure for the token info we expect from the Mirror Node
type TokenInfo = {
  token_id: string;
  name: string;
  symbol: string;
  decimals: string;
  total_supply: string;
  type: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE';
  treasury_account_id: string;
  admin_key: object | null;
  supply_key: object | null;
  // ... and many other fields
};

// The base URL for the Hedera Testnet Mirror Node REST API
const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenInfo | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Example: /api/getTokenInfo?tokenId=0.0.54321
  const { tokenId } = req.query;

  if (!tokenId || typeof tokenId !== 'string') {
    return res.status(400).json({ error: 'tokenId query parameter is required and must be a string.' });
  }

  try {
    // Construct the URL to query the Mirror Node for token information
    const queryUrl = `${MIRROR_NODE_URL}/api/v1/tokens/${tokenId}`;
    
    console.log(`Querying Mirror Node for token info: ${queryUrl}`);

    const response = await fetch(queryUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Token with ID ${tokenId} was not found.`);
      }
      const errorData = await response.json();
      throw new Error(errorData.status?.messages[0]?.message || 'Failed to fetch from Mirror Node');
    }

    const data: TokenInfo = await response.json();

    res.status(200).json(data);

  } catch (error: any) {
    console.error(`Error fetching info for token ${tokenId}:`, error);
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to fetch token info. Reason: ${errorMessage}` });
  }
}