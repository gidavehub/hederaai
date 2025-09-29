// /services/agents/wallet/balanceAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { AccountBalanceQuery, AccountId } from '@hashgraph/sdk';
import hederaClient from '../../../lib/hederaService';
import { geminiModel } from '../../geminiServices';

// The structure of the data this agent fetches
type BalanceData = {
  hbar: string;
  tokens: { tokenId: string; balance: number }[];
};

export default class BalanceAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[BalanceAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const accountId = context.collected_info.accountId;
      if (!accountId) {
        throw new Error("accountId is missing from the context. Cannot proceed.");
      }

      // 2. Execute Primary Function: Fetching balance from the Hedera network
      const balanceData = await this.getAccountBalance(accountId);

      // 3. Formulate Response using LLM with the new, focused prompt
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert raw Hedera account balance data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed to a user or synthesized into a larger report.

        **Your Task:**
        Convert the provided "Balance Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence summary for the orchestrator. E.g., 'Balance found: X HBAR and Y tokens.'",
          "ui": {
            "type": "LIST",
            "props": {
              "title": "Account Balance",
              "items": [
                { "key": "hbar", "primary": "HBAR Balance", "secondary": "The formatted HBAR balance" },
                { "key": "token_id", "primary": "Token ID", "secondary": "Token ID and balance" }
              ]
            }
          }
        }
        
        **Rules:**
        - The 'speech' is for the master agent's context, not for the end-user. Keep it factual.
        - Format the HBAR balance in the UI with commas for readability.
        - If there are tokens, add them to the "items" array in the UI.

        **Balance Data:**
        ${JSON.stringify(balanceData)}

        Now, generate the JSON response.
      `;

      const result = await geminiModel.generateContent(llmPrompt);
      const rawResponseText = result.response.text();

      console.log("[BalanceAgent] Raw LLM Response:", rawResponseText);
      const responseJson = JSON.parse(extractJsonFromResponse(rawResponseText));

      // 4. Construct the Final UARP Object
      return {
        // This agent's turn is always complete.
        status: 'COMPLETE',
        speech: responseJson.speech,
        ui: responseJson.ui,
        // It signals its own sub-goal is finished. The router doesn't use this, but it's good practice.
        action: { type: 'COMPLETE_GOAL' },
        context: {
          ...context,
          status: 'complete',
          history: [...context.history, 'BalanceAgent successfully fetched and formatted balance.'],
        },
      };

    } catch (error: any) {
      console.error('[BalanceAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  /**
   * Fetches the account balance from the Hedera network.
   */
  private async getAccountBalance(accountId: string): Promise<BalanceData> {
    const balanceQuery = new AccountBalanceQuery().setAccountId(AccountId.fromString(accountId));
    const accountBalance = await balanceQuery.execute(hederaClient);

    const tokenBalances = [];
    if (accountBalance.tokens) {
      for (const [tokenId, balance] of accountBalance.tokens._map) {
        tokenBalances.push({
          tokenId: tokenId.toString(),
          balance: balance.toNumber(),
        });
      }
    }

    return {
      hbar: accountBalance.hbars.toString(),
      tokens: tokenBalances,
    };
  }

  /**
   * Creates a standardized error response.
   */
  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE', // The agent's attempt is complete, even though it failed.
      speech: "Error fetching balance.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Balance Check Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `BalanceAgent failed: ${errorMessage}`],
      },
    };
  }
}