import { IAgent, AgentResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../geminiServices';

/**
 * An agent that manages writing to and reading from the user's long-term memory,
 * which is stored on the client-side (e.g., localStorage).
 * It instructs the frontend on what to save.
 */
export default class MemoryAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[MemoryAgent] Executing...');

    // The core function of this agent is to create an action for the frontend.
    // The prompt from the GeneralAgent will be the "fact" to save.
    const factToSave = prompt;

    // We don't need an LLM here, as the task is deterministic.
    // The GeneralAgent has already done the thinking.

    return {
      status: 'COMPLETE',
      speech: "Got it. I'll remember that for you.",
      ui: { 
        type: 'TEXT', 
        props: { 
          title: "Memory Updated",
          text: `Saved: "${factToSave}"`
        } 
      },
      // This is the crucial part: a new action type for the frontend to handle.
      action: {
        type: 'SAVE_TO_MEMORY',
        payload: {
          key: `memory_${Date.now()}`, // Generate a simple unique key
          value: factToSave,
        },
      },
      context: {
        ...context,
        status: 'complete',
        history: [...context.history, `MemoryAgent saved the fact: "${factToSave}"`],
      },
    };
  }
}