// /services/agents/token/sendFungibleAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../../services/geminiServices';

type SendTokenData = {
  transactionId: string;
  message: string;
};

export default class SendFungibleAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[SendFungibleAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId, password } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.tokenId || 
          !context.collected_info.amount || 
          !context.collected_info.recipient) {
        return this.requestTransferInfo(context, prompt);
      }

      // Security check: If password is missing, delegate to SecurityAgent
      if (!password) {
        return {
          status: 'DELEGATING',
          speech: 'Please enter your password to authorize this token transfer.',
          ui: {
            type: 'LOADING',
            props: { text: 'Awaiting password for token transfer authorization...' }
          },
          action: {
            type: 'DELEGATE',
            payload: {
              agent: 'utility/securityAgent',
              prompt: 'Request password for token transfer authorization.'
            }
          },
          context: {
            ...context,
            status: 'delegating',
            history: [...context.history, 'SendFungibleAgent delegating to SecurityAgent for password.'],
          }
        };
      }

      // 2. Execute Primary Function: Sending Token
      const { tokenId, amount, recipient } = context.collected_info;
      const result = await this.sendToken(tokenId, recipient, amount);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera token transfer data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "Token Transfer Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence confirmation. E.g., 'Successfully sent X tokens to account Y.'",
          "ui": {
            "type": "TEXT",
            "props": {
              "title": "Token Transfer Complete",
              "text": "A detailed message including the transaction ID and confirmation."
            }
          }
        }
        
        **Token Transfer Data:**
        ${JSON.stringify({
          ...result,
          tokenId,
          amount,
          recipient
        })}

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
          history: [...context.history, `SendFungibleAgent successfully transferred tokens.`],
        },
      };

    } catch (error: any) {
      console.error('[SendFungibleAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async sendToken(
    tokenId: string,
    recipientId: string,
    amount: number
  ): Promise<SendTokenData> {
    const response = await fetch('/api/sendToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenId,
        recipientAccountId: recipientId,
        amount,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send tokens.');
    }

    return await response.json();
  }

  private requestTransferInfo(context: ConversationContext, prompt: string): AgentResponse {
    // If we don't have token ID, ask for it first
    if (!context.collected_info.tokenId) {
      return {
        status: 'AWAITING_INPUT',
        speech: "Which token would you like to send? Please provide the token ID.",
        ui: {
          type: 'INPUT',
          props: {
            title: "Token ID",
            placeholder: "Enter token ID (e.g., 0.0.12345)",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          status: 'awaiting_user_input',
          history: [...context.history, 'SendFungibleAgent requesting token ID.'],
        },
      };
    }

    // If we have token ID but no amount, ask for it
    if (!context.collected_info.amount) {
      return {
        status: 'AWAITING_INPUT',
        speech: "How many tokens would you like to send?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Amount",
            placeholder: "Enter amount to send",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            tokenId: prompt, // Save the token ID from the previous step
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'SendFungibleAgent requesting amount.'],
        },
      };
    }

    // If we have amount but no recipient, ask for it
    if (!context.collected_info.recipient) {
      return {
        status: 'AWAITING_INPUT',
        speech: "To which account would you like to send the tokens?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Recipient Account",
            placeholder: "Enter recipient's account ID",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            amount: parseFloat(prompt), // Convert string to number
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'SendFungibleAgent requesting recipient account.'],
        },
      };
    }

    throw new Error("Invalid state in requestTransferInfo");
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to send the tokens.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Token Transfer Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `SendFungibleAgent failed: ${errorMessage}`],
      },
    };
  }
}
