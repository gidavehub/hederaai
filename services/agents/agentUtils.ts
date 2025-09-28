import { ConversationContext } from './router';
import { extractJsonFromResponse } from './agentUtils'; // We'll add this function here

// --- The Expanded Universal Agent Response Protocol (UARP) ---
export type AgentResponse = {
  // The status of the AGENT'S CURRENT TURN, not the overall goal.
  // DELEGATING: This agent's turn is done, and it has passed work to others.
  // COMPLETE: This agent's turn is done, and it has a final answer for the user.
  status: "DELEGATING" | "AWAITING_INPUT" | "COMPLETE" | "ERROR";

  // The conversational message for the user (Text-to-Speech).
  speech: string;

  // The dynamic UI to be rendered on the screen.
  ui: any; // Using `any` for flexibility with UI components

  // The machine-readable instruction for the Router.
  action: Action;
  
  // The updated conversation memory.
  context: ConversationContext;
};

// --- The Expanded Grammar of Actions ---
// These are the verbs our agents can use.
export type Action = 
  | { type: "COMPLETE_GOAL" } // The main goal is finished. The conversation can start fresh.
  | { type: "REQUEST_USER_INPUT" } // The UI is interactive; wait for user submission.
  | { 
      type: "DELEGATE"; // NEW: Hand off a single task to a specialist agent.
      payload: { agent: string; prompt: string; };
    }
  | { 
      type: "DELEGATE_PARALLEL"; // NEW: Hand off multiple tasks to run simultaneously.
      payload: { agent: string; prompt: string; }[];
    }
  | { type: "SAVE_CREDENTIALS"; payload: any; } // For the onboarding agent.
  | { type: "EXECUTE_HEDERA_TX"; payload: any; }; // For the send agent.


// --- The Agent Interface (Unchanged) ---
export interface IAgent {
  execute(prompt: string, context: ConversationContext): Promise<AgentResponse>;
}

/**
 * Utility to dynamically import and execute a single specialist agent.
 * The Router will use this to run the tasks delegated by the GeneralAgent.
 */
export async function callAgent(
  agentName: string,
  prompt: string,
  context: ConversationContext
): Promise<AgentResponse> {
  try {
    console.log(`[AgentUtils] Calling agent: ${agentName} with prompt: "${prompt}"`);
    
    // Dynamically import the agent file based on its name.
    const agentModule = await import(`./${agentName}`);
    const agentInstance: IAgent = new agentModule.default();
    
    return await agentInstance.execute(prompt, context);

  } catch (error: any) {
    console.error(`[AgentUtils] Error calling agent "${agentName}":`, error);
    // Return a standardized error response if an agent fails to load or execute.
    return {
      status: 'ERROR',
      speech: "My apologies, a specialist component failed to respond. Please try again.",
      ui: {
        type: 'TEXT',
        props: { title: 'Agent Execution Error', text: `Error in agent: ${agentName}.` }
      },
      action: { type: 'COMPLETE_GOAL' }, // End the flow on an internal error
      context: { ...context, status: 'failed' },
    };
  }
}

/**
 * Extracts a JSON object from a string that might be wrapped in Markdown code fences.
 * LLMs often return responses like "```json\n{...}\n```". This function cleans that up.
 * @param llmResponse - The raw text response from the language model.
 * @returns A string containing only the JSON object.
 * @throws An error if no JSON object is found.
 */
export function extractJsonFromResponse(llmResponse: string): string {
  // Use a regular expression to find the content between the first '{' and the last '}'
  const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return jsonMatch[0];
  }

  console.error("Failed to extract JSON from LLM response:", llmResponse);
  throw new Error("Could not find a valid JSON object in the LLM's response.");
}