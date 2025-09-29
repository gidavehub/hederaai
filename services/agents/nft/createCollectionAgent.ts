// /services/agents/nft/createCollectionAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../../services/geminiServices';

type CreateCollectionData = {
  transactionId: string;
  collectionId: string;
  supplyKey: string;
  message: string;
};

export default class CreateCollectionAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[CreateCollectionAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.collectionName || !context.collected_info.collectionSymbol) {
        return this.requestCollectionInfo(context, prompt);
      }

      // 2. Execute Primary Function: Creating NFT Collection
      const { collectionName, collectionSymbol } = context.collected_info;
      const result = await this.createCollection(collectionName, collectionSymbol);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera NFT collection creation data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "Collection Creation Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence confirmation. E.g., 'Successfully created NFT collection X with ID Y.'",
          "ui": {
            "type": "LAYOUT_STACK",
            "props": {
              "children": [
                {
                  "type": "TEXT",
                  "props": {
                    "title": "Collection Created",
                    "text": "A detailed message including the collection ID and transaction ID."
                  }
                },
                {
                  "type": "TEXT",
                  "props": {
                    "title": "Important",
                    "text": "Save your supply key securely. You will need it to mint NFTs in this collection."
                  }
                }
              ]
            }
          }
        }
        
        **Collection Creation Data:**
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
        // Save the supply key in the context for potential future minting
        action: { 
          type: 'COMPLETE_GOAL',
          payload: {
            collectionId: result.collectionId,
            supplyKey: result.supplyKey
          }
        },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            lastCollectionId: result.collectionId,
            lastSupplyKey: result.supplyKey
          },
          status: 'complete',
          history: [...context.history, `CreateCollectionAgent successfully created NFT collection.`],
        },
      };

    } catch (error: any) {
      console.error('[CreateCollectionAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async createCollection(
    collectionName: string,
    collectionSymbol: string
  ): Promise<CreateCollectionData> {
    const isServer = typeof window === 'undefined';
    if (isServer) {
      const axios = require('axios');
      try {
        const response = await axios.default.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/createNftCollection`,
          { collectionName, collectionSymbol },
          { headers: { 'Content-Type': 'application/json' } }
        );
        return response.data;
      } catch (error: any) {
        const errorMsg = error?.response?.data?.error || error.message || 'Failed to create NFT collection.';
        throw new Error(errorMsg);
      }
    } else {
      const response = await fetch('/api/createNftCollection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionName, collectionSymbol }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create NFT collection.');
      }
      return await response.json();
    }
  }

  private requestCollectionInfo(context: ConversationContext, prompt: string): AgentResponse {
    // If we don't have collection name, ask for it first
    if (!context.collected_info.collectionName) {
      return {
        status: 'AWAITING_INPUT',
        speech: "What would you like to name your NFT collection?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Collection Name",
            placeholder: "Enter collection name",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          status: 'awaiting_user_input',
          history: [...context.history, 'CreateCollectionAgent requesting collection name.'],
        },
      };
    }

    // If we have name but no symbol, ask for symbol
    if (!context.collected_info.collectionSymbol) {
      return {
        status: 'AWAITING_INPUT',
        speech: "What symbol would you like to use for your NFT collection?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Collection Symbol",
            placeholder: "Enter collection symbol (e.g., HNFT)",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            collectionName: prompt, // Save the name from the previous step
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'CreateCollectionAgent requesting collection symbol.'],
        },
      };
    }

    throw new Error("Invalid state in requestCollectionInfo");
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to create the NFT collection.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Collection Creation Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `CreateCollectionAgent failed: ${errorMessage}`],
      },
    };
  }
}
