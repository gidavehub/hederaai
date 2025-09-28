// pages/api/getHistory.ts

import type { NextApiRequest, NextApiResponse } from 'next';

// Define the structure of the transaction data we expect from the Mirror Node
type Transaction = {
  transaction_id: string;
  name: string; // e.g., "CRYPTOTRANSFER"
  result: string; // e.g., "SUCCESS"
  consensus_timestamp: string;
  transfers: {
    account: string;
    amount: number; // in tinybars
  }[];
};

// Define the structure of our successful response
type HistoryResponse = {
  transactions: Transaction[];
  next_link: string | null;
};

// The base URL for the Hedera Testnet Mirror Node REST API
const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HistoryResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Example: /api/getHistory?accountId=0.0.12345&limit=10
  const { accountId, limit = '25' } = req.query; // Default to 25 transactions

  if (!accountId || typeof accountId !== 'string') {
    return res.status(400).json({ error: 'accountId query parameter is required and must be a string.' });
  }

  try {
    // Construct the URL to query the Mirror Node for transactions
    const queryUrl = `${MIRROR_NODE_URL}/api/v1/transactions?account.id=${accountId}&limit=${limit}&order=desc`;
    
    console.log(`Querying Mirror Node: ${queryUrl}`);

    // Fetch data from the Mirror Node
    const response = await fetch(queryUrl);

    if (!response.ok) {
      // If the Mirror Node returns an error, forward it
      const errorData = await response.json();
      throw new Error(errorData.status?.messages[0]?.message || 'Failed to fetch from Mirror Node');
    }

    const data = await response.json();

    // The Mirror Node API returns transactions and a link for pagination
    const responseData: HistoryResponse = {
      transactions: data.transactions || [],
      next_link: data.links?.next || null,
    };

    res.status(200).json(responseData);

  } catch (error: any) {
    console.error(`Error fetching transaction history for account ${accountId}:`, error);
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to fetch transaction history. Reason: ${errorMessage}` });
  }
}