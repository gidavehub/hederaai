import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../geminiServices';

// The base URL for the Hedera Testnet Mirror Node REST API
const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';

type TransactionData = {
  transaction_id: string;
  name: string;
  result: string;
  consensus_timestamp: string;
  transfers: { account: string; amount: number; is_approval: boolean }[];
}[];

export default class HistoryAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[HistoryAgent] Executing as a specialist tool...');

    try {
      // 1. Analyze Context & Parse Prompt for Parameters
      const accountId = context.collected_info.accountId;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }
      
      const limit = this.parseLimitFromPrompt(prompt);
      
      // 2. Execute Primary Function: Fetching history from the Mirror Node
      const historyData = await this.getTransactionHistory(accountId, limit);

      if (historyData.length === 0) {
        return this.createNoHistoryResponse(context);
      }

      // 3. Formulate Response using LLM with a new, focused prompt
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert raw Hedera transaction data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "Transaction Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A friendly, concise summary of the transaction list.",
          "ui": {
            "type": "LIST",
            "props": {
              "title": "Recent Transactions",
              "items": [
                { "key": "tx_id", "primary": "A human-readable summary of the transaction", "secondary": "The date and time of the transaction" }
              ]
            }
          }
        }
        
        **Rules for Data Transformation:**
        - The user's account is ${accountId}. For each transaction, determine if it was a "send" (negative amount for user) or "receive" (positive amount).
        - The amount in the data is in tinybars. Convert it to HBAR (divide by 100,000,000) for the summary.
        - Create a clear 'primary' text, e.g., "Sent 5.25 HBAR to 0.0.67890".
        - The speech should be a single, clear sentence, e.g., "I've found your last ${historyData.length} transactions."

        **Transaction Data:**
        ${JSON.stringify(historyData)}

        Now, generate the JSON response.
      `;
      
      const result = await geminiModel.generateContent(llmPrompt);
      const rawResponseText = result.response.text();

      console.log("[HistoryAgent] Raw LLM Response:", rawResponseText);
      const responseJson = JSON.parse(extractJsonFromResponse(rawResponseText));

      // 4. Construct the Final UARP Object
      return {
        status: 'COMPLETE',
        speech: responseJson.speech,
        ui: responseJson.ui,
        action: { type: 'COMPLETE_GOAL' },
        context: {
          ...context,
          status: 'complete',
          history: [...context.history, `HistoryAgent successfully fetched ${historyData.length} transactions.`],
        },
      };

    } catch (error: any) {
      console.error('[HistoryAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async getTransactionHistory(accountId: string, limit: number): Promise<TransactionData> {
    const queryUrl = `${MIRROR_NODE_URL}/api/v1/transactions?account.id=${accountId}&limit=${limit}&order=desc`;
    const response = await fetch(queryUrl);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.status?.messages[0]?.message || 'Failed to fetch transaction history from the mirror node.');
    }
    const data = await response.json();
    return data.transactions || [];
  }
  
  private parseLimitFromPrompt(prompt: string): number {
      const match = prompt.match(/\d+/);
      if (match) {
          const num = parseInt(match[0], 10);
          if (num > 0 && num <= 100) return num;
      }
      return 10; // Default limit
  }

  private createNoHistoryResponse(context: ConversationContext): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "It looks like there's no transaction history for this account yet.",
      ui: { type: 'TEXT', props: { title: "No History Found", text: "No transactions have been recorded for this account." } },
      action: { type: 'COMPLETE_GOAL' },
      context: { ...context, status: 'complete', history: [...context.history, 'HistoryAgent found no transactions.'] },
    };
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "Sorry, I couldn't pull up your transaction records right now.",
      ui: { type: 'TEXT', props: { title: "History Fetch Failed", text: `Error: ${errorMessage}` } },
      action: { type: 'COMPLETE_GOAL' },
      context: { ...context, status: 'failed', history: [...context.history, `HistoryAgent failed: ${errorMessage}`] },
    };
  }
}