// pages/api/associateToken.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import hederaClient from '../../lib/hederaService';
import { TokenAssociateTransaction, AccountId, TokenId } from '@hashgraph/sdk';

// Define the structure of the request body
type AssociateTokenRequestBody = {
  tokenId: string;
  accountIdToAssociate?: string; // Optional: defaults to the operator account
};

// Define the structure of our successful response
type AssociateTokenResponse = {
  transactionId: string;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AssociateTokenResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { tokenId, accountIdToAssociate }: AssociateTokenRequestBody = req.body;

  // --- Input Validation ---
  if (!tokenId || typeof tokenId !== 'string') {
    return res.status(400).json({ error: 'tokenId is required in the request body.' });
  }
  // --- End Validation ---
  
  try {
    // Default to the operator account if no specific account is provided
    const accountId = accountIdToAssociate || process.env.HEDERA_ACCOUNT_ID;
    if (!accountId) {
      throw new Error("Target account ID is not defined.");
    }

    console.log(`Attempting to associate account ${accountId} with token ${tokenId}`);

    // Create the token association transaction
    // The account to associate must sign this transaction.
    // Since our client is configured with the operator's key, it can sign for itself.
    const transaction = new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setTokenIds([TokenId.fromString(tokenId)])
      .freezeWith(hederaClient); // Freeze the transaction for signing

    // The SDK's client operator will automatically sign this transaction
    const txResponse = await transaction.execute(hederaClient);
    
    // Get the receipt to confirm success
    const receipt = await txResponse.getReceipt(hederaClient);

    const transactionStatus = receipt.status.toString();
    if (transactionStatus !== 'SUCCESS') {
      throw new Error(`Token association failed with status: ${transactionStatus}`);
    }

    const responseData: AssociateTokenResponse = {
      transactionId: txResponse.transactionId.toString(),
      message: `Account ${accountId} successfully associated with token ${tokenId}.`,
    };

    console.log(responseData.message);
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Error associating token:', error);
    // Handle common errors, like "TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT"
    if (error.message && error.message.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
        return res.status(409).json({ error: 'This account is already associated with the token.' });
    }
    const errorMessage = error.message || 'An unknown error occurred';
    res.status(500).json({ error: `Failed to associate token. Reason: ${errorMessage}` });
  }
}