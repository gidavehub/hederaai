// /services/agents/hcs/createTopicAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../../services/geminiServices';

type CreateTopicData = {
  transactionId: string;
  topicId: string;
  message: string;
};

export default class CreateTopicAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[CreateTopicAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.topicMemo) {
        return this.requestTopicInfo(context);
      }

      // 2. Execute Primary Function: Creating Topic
      const { topicMemo } = context.collected_info;
      const result = await this.createTopic(topicMemo);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera Consensus Service topic creation data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "Topic Creation Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence confirmation. E.g., 'Successfully created HCS topic with ID X.'",
          "ui": {
            "type": "TEXT",
            "props": {
              "title": "Topic Created",
              "text": "A detailed message including the topic ID and transaction ID."
            }
          }
        }
        
        **Topic Creation Data:**
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
        action: { 
          type: 'COMPLETE_GOAL',
          payload: {
            topicId: result.topicId
          }
        },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            lastTopicId: result.topicId
          },
          status: 'complete',
          history: [...context.history, `CreateTopicAgent successfully created HCS topic.`],
        },
      };

    } catch (error: any) {
      console.error('[CreateTopicAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async createTopic(memo?: string): Promise<CreateTopicData> {
    const response = await fetch('/api/createTopic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create HCS topic.');
    }

    return await response.json();
  }

  private requestTopicInfo(context: ConversationContext): AgentResponse {
    return {
      status: 'AWAITING_INPUT',
      speech: "Would you like to add a description (memo) for your HCS topic? This is optional but helps identify the topic's purpose.",
      ui: {
        type: 'INPUT',
        props: {
          title: "Topic Description",
          placeholder: "Enter topic description (optional)",
        }
      },
      action: { type: 'REQUEST_USER_INPUT' },
      context: {
        ...context,
        status: 'awaiting_user_input',
        history: [...context.history, 'CreateTopicAgent requesting topic memo.'],
      },
    };
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to create the HCS topic.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Topic Creation Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `CreateTopicAgent failed: ${errorMessage}`],
      },
    };
  }
}
