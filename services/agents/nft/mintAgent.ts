// /services/agents/nft/mintAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../../services/geminiServices';

type MintNftData = {
  transactionId: string;
  serialNumbers: number[];
  message: string;
};

export default class MintAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[MintAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.collectionId || 
          !context.collected_info.metadata ||
          !context.collected_info.supplyKey) {
        return this.requestMintInfo(context, prompt);
      }

      // 2. Execute Primary Function: Minting NFT
      const { collectionId, metadata, supplyKey } = context.collected_info;
      const result = await this.mintNft(collectionId, supplyKey, metadata);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera NFT minting data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "NFT Minting Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence confirmation. E.g., 'Successfully minted NFT #X in collection Y.'",
          "ui": {
            "type": "TEXT",
            "props": {
              "title": "NFT Minted",
              "text": "A detailed message including the serial number(s) and transaction ID."
            }
          }
        }
        
        **NFT Minting Data:**
        ${JSON.stringify({
          ...result,
          collectionId,
          metadata
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
          collected_info: {
            ...context.collected_info,
            lastMintedSerials: result.serialNumbers
          },
          status: 'complete',
          history: [...context.history, `MintAgent successfully minted NFT.`],
        },
      };

    } catch (error: any) {
      console.error('[MintAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async mintNft(
    collectionId: string,
    supplyKey: string,
    metadata: string
  ): Promise<MintNftData> {
    const response = await fetch('/api/mintNft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectionId,
        supplyKey,
        metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to mint NFT.');
    }

    return await response.json();
  }

  private requestMintInfo(context: ConversationContext, prompt: string): AgentResponse {
    // If we don't have collection ID, ask for it first
    if (!context.collected_info.collectionId) {
      return {
        status: 'AWAITING_INPUT',
        speech: "Which NFT collection would you like to mint into? Please provide the collection ID.",
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
          history: [...context.history, 'MintAgent requesting collection ID.'],
        },
      };
    }

    // If we have collection ID but no supply key, ask for it
    if (!context.collected_info.supplyKey) {
      return {
        status: 'AWAITING_INPUT',
        speech: "Please provide the supply key for this collection. This is required to mint new NFTs.",
        ui: {
          type: 'INPUT',
          props: {
            title: "Supply Key",
            placeholder: "Enter the collection's supply key",
            type: "password"
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
          history: [...context.history, 'MintAgent requesting supply key.'],
        },
      };
    }

    // If we have supply key but no metadata, ask for it
    if (!context.collected_info.metadata) {
      return {
        status: 'AWAITING_INPUT',
        speech: "What metadata would you like to associate with this NFT? This could be an IPFS CID or other content identifier.",
        ui: {
          type: 'INPUT',
          props: {
            title: "NFT Metadata",
            placeholder: "Enter metadata (e.g., ipfs://...)",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            supplyKey: prompt, // Save the supply key from the previous step
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'MintAgent requesting NFT metadata.'],
        },
      };
    }

    throw new Error("Invalid state in requestMintInfo");
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to mint the NFT.",
      ui: {
        type: 'TEXT',
        props: {
          title: "NFT Minting Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `MintAgent failed: ${errorMessage}`],
      },
    };
  }
}
