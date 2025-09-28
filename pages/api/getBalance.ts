// pages/api/getBalance.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import { AccountBalanceQuery, AccountId } from '@hashgraph/sdk';

// Define the structure of our successful response
type BalanceResponse = {
  hbar: string;
  tokens: {
    tokenId: string;
    balance: number;
  }[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BalanceResponse | { error: string }>
) {
  // We will use GET for read-only requests like fetching a balance.
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // The account ID will be passed as a query parameter
  // Example: /api/getBalance?accountId=0.0.12345
  const { accountId } = req.query;

  if (!accountId || typeof accountId !== 'string') {
    return res.status(400).json({ error: 'accountId query parameter is required and must be a string.' });
  }

  try {
    // Create the query
    const balanceQuery = new AccountBalanceQuery().setAccountId(AccountId.fromString(accountId));

    // Execute the query against the Hedera network
    const accountBalance = await balanceQuery.execute(hederaClient);

    // Prepare the token balances for the response
    const tokenBalances = [];
    if (accountBalance.tokens) {
      for (const [tokenId, balance] of accountBalance.tokens._map) {
        tokenBalances.push({
          tokenId: tokenId.toString(),
          balance: balance.toNumber(),
        });
      }
    }

    // Format the response data
    const responseData: BalanceResponse = {
      hbar: accountBalance.hbars.toString(), // Returns balance in HBAR
      tokens: tokenBalances,
    };

    console.log(`Successfully fetched balance for ${accountId}:`, responseData);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error(`Error fetching balance for account ${accountId}:`, error);
    // Provide a more specific error message if available
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to fetch account balance. Reason: ${errorMessage}` });
  }
}