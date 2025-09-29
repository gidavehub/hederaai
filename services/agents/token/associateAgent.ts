// /services/agents/token/associateAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../geminiServices';

type AssociateTokenData = {
  transactionId: string;
  message: string;
};

export default class AssociateAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[AssociateAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.tokenId) {
        return this.requestTokenInfo(context);
      }

      // 2. Execute Primary Function: Associating Token
      const { tokenId } = context.collected_info;
      const result = await this.associateToken(tokenId, accountId);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera token association data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "Token Association Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence confirmation. E.g., 'Successfully associated token X with your account.'",
          "ui": {
            "type": "TEXT",
            "props": {
              "title": "Token Associated",
              "text": "A detailed message including the transaction ID and confirmation."
            }
          }
        }
        
        **Token Association Data:**
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
          history: [...context.history, `AssociateAgent successfully associated token.`],
        },
      };

    } catch (error: any) {
      console.error('[AssociateAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async associateToken(tokenId: string, accountId: string): Promise<AssociateTokenData> {
    const response = await fetch('/api/associateToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenId,
        accountIdToAssociate: accountId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to associate token.');
    }

    return await response.json();
  }

  private requestTokenInfo(context: ConversationContext): AgentResponse {
    return {
      status: 'AWAITING_INPUT',
      speech: "Which token would you like to associate with your account? Please provide the token ID.",
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
        history: [...context.history, 'AssociateAgent requesting token ID.'],
      },
    };
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to associate the token.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Token Association Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `AssociateAgent failed: ${errorMessage}`],
      },
    };
  }
}
