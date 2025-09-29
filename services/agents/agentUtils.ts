// /services/agents/agentUtils.ts

// --- The Conversation Context (Short-Term Memory) ---
// This is the state passed between each turn of a single conversation goal.
export type ConversationContext = {
  goal: string | null;
  status: 'pending' | 'awaiting_user_input' | 'delegating' | 'complete' | 'failed';
  collected_info: { [key: string]: any };
  call_stack: string[];
  history: string[];
};


// --- The Universal Agent Response Protocol (UARP) ---
// This is the standardized object every agent MUST return.
export type AgentResponse = {
  // The status of the AGENT'S CURRENT TURN.
  // DELEGATING: This agent's turn is done, and it has passed work to others.
  // AWAITING_INPUT: This agent is paused, waiting for more info from the user.
  // COMPLETE: This agent's turn is done, and it has a final answer for the user.
  // ERROR: The agent encountered an unrecoverable error.
  status: 'DELEGATING' | 'AWAITING_INPUT' | 'COMPLETE' | 'ERROR';

  // The conversational message for the user (Text-to-Speech).
  speech: string;

  // The dynamic UI to be rendered on the screen.
  ui: any; // Using `any` for flexibility with various UI components.

  // The machine-readable instruction for the Router or Frontend.
  action: Action;

  // The updated conversation memory for the next turn.
  context: ConversationContext;
};

// --- The Expanded Grammar of Actions ---
// These are the "verbs" our agents use to command the system.
export type Action =
  // Core Flow Control
  | { type: 'COMPLETE_GOAL' } // The main goal is finished. The system can start a fresh turn.
  | { type: 'REQUEST_USER_INPUT' } // The UI is interactive; wait for user submission.

  // Orchestration Actions (used by GeneralAgent, handled by Router)
  | {
      type: 'DELEGATE'; // Hand off a single task to a specialist agent.
      payload: { agent: string; prompt: string; };
    }
  | {
      type: 'DELEGATE_PARALLEL'; // Hand off multiple tasks to run simultaneously.
      payload: { agent: string; prompt: string; }[];
    }
    
  // Client-Side Actions (handled by Frontend)
  | { 
      type: 'SAVE_CREDENTIALS'; // For the onboarding agent to save user data locally.
      payload: any; 
    }
  | {
      type: 'UPDATE_LONG_TERM_MEMORY'; // For the memory agent to instruct the client.
      payload: {
          operation: 'set' | 'delete';
          key: string;
          value?: any; // Value is optional for 'delete'
      }
    }

  // Hedera-Specific Actions (future use, e.g., for sendAgent)
  | { type: 'EXECUTE_HEDERA_TX'; payload: any; };


// --- The Agent Interface (Unchanged) ---
export interface IAgent {
  execute(prompt: string, context: ConversationContext): Promise<AgentResponse>;
}


/**
 * Utility to dynamically import and execute a single agent by name.
 * The Router uses this to run the tasks planned by the GeneralAgent.
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
      context: { ...context, status: 'failed', history: [...context.history, `Agent ${agentName} failed to execute.`] },
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
  const jsonMatch = llmResponse.match(/{[\s\S]*}/);

  if (jsonMatch) {
    return jsonMatch[0];
  }

  console.error("Failed to extract JSON from LLM response:", llmResponse);
  throw new Error("Could not find a valid JSON object in the LLM's response.");
}