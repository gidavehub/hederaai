// /services/agents/hcs/getMessagesAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../../services/geminiServices';

type TopicMessage = {
  consensus_timestamp: string;
  message: string;
  sequence_number: number;
};

type GetMessagesData = {
  messages: TopicMessage[];
  next_link: string | null;
};

export default class GetMessagesAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[GetMessagesAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.topicId) {
        return this.requestTopicInfo(context);
      }

      // 2. Execute Primary Function: Fetching Messages
      const { topicId } = context.collected_info;
      const result = await this.getMessages(topicId);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera HCS message data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "Topic Messages Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence summary. E.g., 'Found X messages in topic Y.'",
          "ui": {
            "type": "LIST",
            "props": {
              "title": "Topic Messages",
              "items": [
                { "key": "msg_id", "primary": "Message content", "secondary": "Timestamp" }
              ]
            }
          }
        }
        
        **Topic Messages Data:**
        ${JSON.stringify({
          ...result,
          topicId
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
          history: [...context.history, `GetMessagesAgent successfully retrieved messages from topic.`],
        },
      };

    } catch (error: any) {
      console.error('[GetMessagesAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async getMessages(topicId: string): Promise<GetMessagesData> {
    const response = await fetch(`/api/getTopicMessages?topicId=${topicId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch topic messages.');
    }

    return await response.json();
  }

  private requestTopicInfo(context: ConversationContext): AgentResponse {
    return {
      status: 'AWAITING_INPUT',
      speech: "Which topic would you like to read messages from? Please provide the topic ID.",
      ui: {
        type: 'INPUT',
        props: {
          title: "Topic ID",
          placeholder: "Enter topic ID (e.g., 0.0.12345)",
        }
      },
      action: { type: 'REQUEST_USER_INPUT' },
      context: {
        ...context,
        status: 'awaiting_user_input',
        history: [...context.history, 'GetMessagesAgent requesting topic ID.'],
      },
    };
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to fetch the messages.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Message Retrieval Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `GetMessagesAgent failed: ${errorMessage}`],
      },
    };
  }
}
