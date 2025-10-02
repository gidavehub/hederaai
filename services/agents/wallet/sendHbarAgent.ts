// /services/agents/wallet/sendHbarAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../geminiServices';

type SendHbarData = {
  transactionId: string;
  message: string;
};

export default class SendHbarAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[SendHbarAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId, password } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.recipient || !context.collected_info.amount) {
        return this.requestTransactionInfo(context, prompt);
      }

      // Security check: If password is missing, delegate to SecurityAgent
      if (!password) {
        return {
          status: 'DELEGATING',
          speech: 'Please enter your password to authorize this transaction.',
          ui: {
            type: 'LOADING',
            props: { text: 'Awaiting password for transaction authorization...' }
          },
          action: {
            type: 'DELEGATE',
            payload: {
              agent: 'utility/securityAgent',
              prompt: 'Request password for transaction authorization.'
            }
          },
          context: {
            ...context,
            status: 'delegating',
            history: [...context.history, 'SendHbarAgent delegating to SecurityAgent for password.'],
          }
        };
      }

      // 2. Execute Primary Function: Sending HBAR
      const { recipient, amount } = context.collected_info;
      const result = await this.sendHbar(recipient, amount);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera transaction data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "Transaction Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence confirmation. E.g., 'Successfully sent X HBAR to account Y.'",
          "ui": {
            "type": "TEXT",
            "props": {
              "title": "Transaction Complete",
              "text": "A detailed message including the transaction ID and confirmation."
            }
          }
        }
        
        **Transaction Data:**
        ${JSON.stringify(result)}

        Now, generate the JSON response.
      `;

      const aiResult = await geminiModel.generateContent(llmPrompt);
      const rawResponseText = aiResult.response.text();
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
          history: [...context.history, `SendHbarAgent successfully executed transfer.`],
        },
      };

    } catch (error: any) {
      console.error('[SendHbarAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async sendHbar(recipientId: string, amount: number): Promise<SendHbarData> {
    const response = await fetch('/api/sendHbar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientAccountId: recipientId, amount }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send HBAR.');
    }

    return await response.json();
  }

  private requestTransactionInfo(context: ConversationContext, prompt: string): AgentResponse {
    // If we don't have recipient, ask for it first
    if (!context.collected_info.recipient) {
      return {
        status: 'AWAITING_INPUT',
        speech: "Please provide the recipient's account ID.",
        ui: {
          type: 'INPUT',
          props: {
            title: "Recipient Account",
            placeholder: "0.0.12345",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          status: 'awaiting_user_input',
          history: [...context.history, 'SendHbarAgent requesting recipient account ID.'],
        },
      };
    }

    // If we have recipient but no amount, ask for amount
    if (!context.collected_info.amount) {
      return {
        status: 'AWAITING_INPUT',
        speech: "How many HBAR would you like to send?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Amount",
            placeholder: "Enter amount in HBAR",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            recipient: prompt, // Save the recipient from the previous step
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'SendHbarAgent requesting transfer amount.'],
        },
      };
    }

    throw new Error("Invalid state in requestTransactionInfo");
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to send HBAR.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Transaction Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `SendHbarAgent failed: ${errorMessage}`],
      },
    };
  }
}
