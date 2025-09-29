// /services/agents/token/createFungibleAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../geminiServices';

type CreateTokenData = {
  transactionId: string;
  tokenId: string;
  message: string;
};

export default class CreateFungibleAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[CreateFungibleAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.tokenName || !context.collected_info.tokenSymbol || !context.collected_info.initialSupply) {
        return this.requestTokenInfo(context, prompt);
      }

      // 2. Execute Primary Function: Creating Token
      const { tokenName, tokenSymbol, initialSupply, decimals = 0 } = context.collected_info;
      const result = await this.createToken(tokenName, tokenSymbol, initialSupply, decimals);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera token creation data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "Token Creation Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence confirmation. E.g., 'Successfully created token X with ID Y.'",
          "ui": {
            "type": "TEXT",
            "props": {
              "title": "Token Created",
              "text": "A detailed message including the token ID and transaction ID."
            }
          }
        }
        
        **Token Creation Data:**
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
          history: [...context.history, `CreateFungibleAgent successfully created token.`],
        },
      };

    } catch (error: any) {
      console.error('[CreateFungibleAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async createToken(
    tokenName: string,
    tokenSymbol: string,
    initialSupply: number,
    decimals: number
  ): Promise<CreateTokenData> {
    const response = await fetch('/api/createToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenName,
        tokenSymbol,
        initialSupply,
        decimals,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create token.');
    }

    return await response.json();
  }

  private requestTokenInfo(context: ConversationContext, prompt: string): AgentResponse {
    // If we don't have token name, ask for it first
    if (!context.collected_info.tokenName) {
      return {
        status: 'AWAITING_INPUT',
        speech: "What would you like to name your token?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Token Name",
            placeholder: "Enter token name",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          status: 'awaiting_user_input',
          history: [...context.history, 'CreateFungibleAgent requesting token name.'],
        },
      };
    }

    // If we have name but no symbol, ask for symbol
    if (!context.collected_info.tokenSymbol) {
      return {
        status: 'AWAITING_INPUT',
        speech: "What symbol would you like to use for your token?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Token Symbol",
            placeholder: "Enter token symbol (e.g., TKN)",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            tokenName: prompt, // Save the name from the previous step
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'CreateFungibleAgent requesting token symbol.'],
        },
      };
    }

    // If we have symbol but no initial supply, ask for it
    if (!context.collected_info.initialSupply) {
      return {
        status: 'AWAITING_INPUT',
        speech: "What should the initial supply of your token be?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Initial Supply",
            placeholder: "Enter initial token supply",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            tokenSymbol: prompt, // Save the symbol from the previous step
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'CreateFungibleAgent requesting initial supply.'],
        },
      };
    }

    throw new Error("Invalid state in requestTokenInfo");
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to create the token.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Token Creation Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `CreateFungibleAgent failed: ${errorMessage}`],
      },
    };
  }
}
