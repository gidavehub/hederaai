// /services/agents/utility/memoryAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../geminiServices';

export default class MemoryAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[MemoryAgent] Executing as a specialist tool...');

    try {
      const llmPrompt = `
        You are a specialist AI function that manages a user's long-term memory.
        Your task is to interpret a user's request and convert it into a structured command for the client-side storage system.

        **Your Thought Process:**
        1.  **Analyze the Prompt:** Determine the user's intent. Do they want to SAVE a new memory, UPDATE an existing one, or DELETE a memory?
        2.  **Identify the Key:** Extract the core concept or topic of the memory. This will be the unique 'key' for storage.
        3.  **Identify the Value:** Extract the specific information the user wants to remember. This will be the 'value'.
        4.  **Determine the Operation:**
            - If the user wants to remember something new or change an existing memory, the operation is 'set'.
            - If the user wants to forget something, the operation is 'delete'.

        **Your Response MUST be a valid UARP JSON object only.**

        **UARP Schema to Generate:**
        {
          "speech": "A confirmation message for the user. E.g., 'Okay, I'll remember that.', 'Got it, I've cleared that from my memory.'",
          "ui": {
            "type": "TEXT",
            "props": {
              "title": "Memory Updated",
              "text": "Confirmation of the action taken."
            }
          },
          "action": {
            "type": "UPDATE_LONG_TERM_MEMORY",
            "payload": {
              "operation": "'set' | 'delete'",
              "key": "A concise, machine-readable key for the memory (e.g., 'spendingGoal')",
              "value": "The specific information to be stored (for 'set' operations)."
            }
          }
        }

        **Example Scenarios:**
        -   **User Prompt:** "Remember that my weekly spending goal is 250 HBAR."
            -   **Resulting Payload:** { "operation": "set", "key": "weeklySpendingGoal", "value": "250 HBAR" }
        -   **User Prompt:** "Hey, can you remind me that I need to call my sister on Tuesday?"
            -   **Resulting Payload:** { "operation": "set", "key": "tuesdayReminder", "value": "Call my sister" }
        -   **User Prompt:** "Forget what I said about my spending goal."
            -   **Resulting Payload:** { "operation": "delete", "key": "weeklySpendingGoal" }

        ---
        **User's Memory Request:** "${prompt}"
        ---

        Now, generate the UARP JSON command.
      `;

      const result = await geminiModel.generateContent(llmPrompt);
      const rawResponseText = result.response.text();
      console.log("[MemoryAgent] Raw LLM Response:", rawResponseText);
      const responseJson = JSON.parse(extractJsonFromResponse(rawResponseText));

      // Construct the final AgentResponse
      return {
        status: 'COMPLETE',
        speech: responseJson.speech,
        ui: responseJson.ui,
        action: responseJson.action, // This is the critical part for the frontend
        context: {
          ...context,
          status: 'complete',
          history: [...context.history, `MemoryAgent processed a '${responseJson.action.payload.operation}' command.`],
        },
      };

    } catch (error: any) {
      console.error('[MemoryAgent] Error:', error);
      return {
        status: 'ERROR',
        speech: "I had trouble accessing my memory circuits just now. Please try again.",
        ui: { type: 'TEXT', props: { title: "Memory Error", text: `Error: ${error.message}` } },
        action: { type: 'COMPLETE_GOAL' },
        context: { ...context, status: 'failed', history: [...context.history, `MemoryAgent failed: ${error.message}`] },
      };
    }
  }
}