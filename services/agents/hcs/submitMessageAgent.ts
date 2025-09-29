// /services/agents/hcs/submitMessageAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../../services/geminiServices';

type SubmitMessageData = {
  transactionId: string;
  message: string;
};

export default class SubmitMessageAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[SubmitMessageAgent] Executing as a specialist tool...');

    try {
      // 1. Get Required Info from Context
      const { accountId } = context.collected_info;
      if (!accountId) {
        throw new Error("accountId is missing from the context.");
      }

      // If this is a new request, start the collection process
      if (!context.collected_info.topicId || !context.collected_info.message) {
        return this.requestMessageInfo(context, prompt);
      }

      // 2. Execute Primary Function: Submitting Message
      const { topicId, message } = context.collected_info;
      const result = await this.submitMessage(topicId, message);

      // 3. Formulate Response using LLM
      const llmPrompt = `
        You are a specialist AI agent function. Your sole purpose is to convert Hedera HCS message submission data into a standardized UARP JSON object.
        You will be called by a master orchestrator (the GeneralAgent), which will handle the main user conversation.
        Your response should be self-contained and ready to be displayed.

        **Your Task:**
        Convert the provided "Message Submission Data" into a valid JSON object with "speech" and "ui" fields.
        Respond with ONLY the raw JSON object, without any markdown formatting or other text.

        **UARP JSON Structure to Generate:**
        {
          "speech": "A factual, one-sentence confirmation. E.g., 'Successfully submitted message to topic X.'",
          "ui": {
            "type": "TEXT",
            "props": {
              "title": "Message Submitted",
              "text": "A detailed message including the transaction ID and confirmation."
            }
          }
        }
        
        **Message Submission Data:**
        ${JSON.stringify({
          ...result,
          topicId,
          message
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
          history: [...context.history, `SubmitMessageAgent successfully submitted message to HCS.`],
        },
      };

    } catch (error: any) {
      console.error('[SubmitMessageAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  private async submitMessage(
    topicId: string,
    message: string
  ): Promise<SubmitMessageData> {
    const response = await fetch('/api/submitHcsMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicId,
        message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit message.');
    }

    return await response.json();
  }

  private requestMessageInfo(context: ConversationContext, prompt: string): AgentResponse {
    // If we don't have topic ID, ask for it first
    if (!context.collected_info.topicId) {
      return {
        status: 'AWAITING_INPUT',
        speech: "Which topic would you like to submit a message to? Please provide the topic ID.",
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
          history: [...context.history, 'SubmitMessageAgent requesting topic ID.'],
        },
      };
    }

    // If we have topic ID but no message, ask for the message
    if (!context.collected_info.message) {
      return {
        status: 'AWAITING_INPUT',
        speech: "What message would you like to submit to this topic?",
        ui: {
          type: 'INPUT',
          props: {
            title: "Message",
            placeholder: "Enter your message",
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            topicId: prompt, // Save the topic ID from the previous step
          },
          status: 'awaiting_user_input',
          history: [...context.history, 'SubmitMessageAgent requesting message content.'],
        },
      };
    }

    throw new Error("Invalid state in requestMessageInfo");
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I encountered an error while trying to submit the message.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Message Submission Failed",
          text: `Error: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `SubmitMessageAgent failed: ${errorMessage}`],
      },
    };
  }
}
