// /services/agents/nft/sendNftAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../../services/geminiServices';

type SendNftData = {
  transactionId: string;
  message: string;
};

export default class SendNftAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[SendNftAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.collectionId || 
          !context.collected_info.serialNumber || 
          !context.collected_info.recipient) {
        return this.requestNftInfo(context, prompt);
      }

      // 2. Execute Primary Function: Sending NFT
      const { collectionId, serialNumber, recipient } = context.collected_info;
      const result = await this.sendNft(collectionId, serialNumber, recipient);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera NFT transfer data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "NFT Transfer Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence confirmation. E.g., 'Successfully sent NFT #X from collection Y to account Z.'",
          "ui": {
            "type": "TEXT",
            "props": {
              "title": "NFT Transfer Complete",
              "text": "A detailed message including the transaction ID and confirmation."
            }
          }
        }
        
        **NFT Transfer Data:**
        ${JSON.stringify({
          ...result,
          collectionId,
          serialNumber,
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
          history: [...context.history, `SendNftAgent successfully transferred NFT.`],
        },
      };

    } catch (error: any) {
      console.error('[SendNftAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async sendNft(
    collectionId: string,
    serialNumber: number,
    recipientAccountId: string
  ): Promise<SendNftData> {
    const response = await fetch('/api/sendNft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectionId,
        serialNumber,
        recipientAccountId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send NFT.');
    }

    return await response.json();
  }

  private requestNftInfo(context: ConversationContext, prompt: string): AgentResponse {
    // If we don't have collection ID, ask for it first
    if (!context.collected_info.collectionId) {
      return {
        status: 'AWAITING_INPUT',
        speech: "Which NFT collection does the NFT belong to? Please provide the collection ID.",
        ui: {
          type: 'INPUT',
          props: {
            title: "Collection ID",
            placeholder: "Enter collection ID (e.g., 0.0.12345)",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          status: 'awaiting_user_input',
          history: [...context.history, 'SendNftAgent requesting collection ID.'],
        },
      };
    }

    // If we have collection ID but no serial number, ask for it
    if (!context.collected_info.serialNumber) {
      return {
        status: 'AWAITING_INPUT',
        speech: "What is the serial number of the NFT you want to send?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Serial Number",
            placeholder: "Enter NFT serial number",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            collectionId: prompt, // Save the collection ID from the previous step
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'SendNftAgent requesting NFT serial number.'],
        },
      };
    }

    // If we have serial number but no recipient, ask for it
    if (!context.collected_info.recipient) {
      return {
        status: 'AWAITING_INPUT',
        speech: "To which account would you like to send this NFT?",
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
            serialNumber: parseInt(prompt, 10), // Convert string to number
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'SendNftAgent requesting recipient account.'],
        },
      };
    }

    throw new Error("Invalid state in requestNftInfo");
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to send the NFT.",
      ui: {
        type: 'TEXT',
        props: {
          title: "NFT Transfer Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `SendNftAgent failed: ${errorMessage}`],
      },
    };
  }
}
