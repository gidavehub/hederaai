import { callAgent } from './agentUtils';
import { AGENT_REGISTRY } from './registry';
import { geminiModel } from '../geminiServices';

// The structure of our conversation's memory
export type ConversationContext = {
  // A machine-readable goal, e.g., "get_balance" or "complex_query"
  goal: string; 
  // The current state of that goal
  status: 'pending' | 'awaiting_user_input' | 'delegating' | 'complete' | 'failed';
  // Information we've gathered from the user
  collected_info: { [key: string]: any };
  // A stack of agents working on the current goal. The last one is the active one.
  call_stack: string[];
  // A human-readable history of events in the conversation
  history: string[];
};

/**
 * The main entry point for routing all user requests.
 * It acts as a high-speed triage unit, deciding which agent should handle the prompt.
 */
export async function routeRequest(prompt: string, context: ConversationContext | null) {
  // --- 1. GATEKEEPER LOGIC: Check for Authentication ---
  // If there's no context or no accountId, the user MUST be onboarded.
  if (!context || !context.collected_info.accountId) {
    console.log('[Router] Gatekeeper: User not authenticated. Forcing onboarding.');
    
    // If onboarding is already in progress, continue it.
    if (context && context.goal === 'onboarding') {
      return callAgent('utility/onboardingAgent', prompt, context);
    }
    
    // Otherwise, start a brand new onboarding session.
    const onboardingContext = initializeContext('utility/onboardingAgent', prompt);
    // We pass an empty prompt to the agent on its first run to let it ask the first question.
    return callAgent('utility/onboardingAgent', '', onboardingContext); 
  }

  // --- 2. CONTINUITY LOGIC: Handle Ongoing Multi-Step Goals ---
  // If a previous turn left the system waiting for the user, we don't need to re-classify.
  // We continue with the agent that was already working.
  if (context.status === 'awaiting_user_input' || context.status === 'pending') {
    console.log(`[Router] Continuing conversation. Goal: ${context.goal}, Status: ${context.status}`);
    const activeAgentName = context.call_stack[context.call_stack.length - 1];
    return callAgent(activeAgentName, prompt, context);
  }

  // --- 3. AI TRIAGE LOGIC: Classify New, Standalone Requests ---
  // The previous goal is complete, so this is a new request.
  console.log('[Router] Previous goal complete. Using AI to classify new intent.');
  const targetAgentName = await classifyIntentWithAI(prompt);

  console.log(`[Router] AI classified intent to: ${targetAgentName}`);
  const newContext = initializeContext(targetAgentName, prompt, context.collected_info);
  
  return callAgent(targetAgentName, prompt, newContext);
}

/**
 * Uses an LLM to classify the user's intent and select the appropriate agent.
 * @param prompt The user's request.
 * @returns The name of the agent best suited to handle the request.
 */
async function classifyIntentWithAI(prompt: string): Promise<string> {
  // Filter the registry to only include specialist "tools" the LLM can choose from.
  const specialistAgents = Object.entries(AGENT_REGISTRY)
    .filter(([key]) => key !== 'general/generalAgent' && key !== 'utility/unknownAgent')
    .map(([key, value]) => `- ${key}: ${value.description}`)
    .join('\n');

  const classificationPrompt = `
    You are an expert AI request router for a Hedera Hashgraph wallet assistant.
    Your task is to analyze the user's prompt and determine the single best agent to handle it initially.

    You have two choices:
    1. A specific specialist agent if the prompt is a direct, simple command.
    2. The 'general/generalAgent' if the prompt is conversational, complex, multi-part, ambiguous, or a question.

    **RULE: If in doubt, always choose 'general/generalAgent'. It is the main brain.**

    Here are the available specialist agents:
    ${specialistAgents}

    Analyze the following user prompt and respond with ONLY the name of the chosen agent. Do not provide any explanation or other text.

    User Prompt: "${prompt}"
  `;

  try {
    const result = await geminiModel.generateContent(classificationPrompt);
    const agentName = result.response.text().trim();
    
    // Validate the LLM's response to ensure it's a real agent
    if (AGENT_REGISTRY[agentName]) {
      return agentName;
    }
    console.warn(`[Router] LLM returned an invalid agent name: "${agentName}". Defaulting to generalAgent.`);
    return 'general/generalAgent'; // Fallback to the main brain
  } catch (error) {
    console.error('[Router] Error during AI classification:', error);
    return 'general/generalAgent'; // If classification fails, the GeneralAgent must handle it.
  }
}

/**
 * Creates a new, clean conversation context for a new goal.
 * @param agentName The name of the agent that will handle the goal.
 * @param prompt The user's prompt that initiated the goal.
 * @param existingInfo Previously collected user info (like name, accountId) to carry over.
 * @returns A fully formed ConversationContext object.
 */
function initializeContext(
  agentName: string,
  prompt: string,
  existingInfo: { [key: string]: any } = {}
): ConversationContext {
  const goal = agentName.split('/')[1].replace('Agent', ''); // e.g., "balance" or "general"

  const context: ConversationContext = {
    goal: goal,
    status: 'pending',
    // We start with no collected info specific to this goal, but carry over user identity
    collected_info: { ...existingInfo, originalPrompt: prompt },
    call_stack: [agentName],
    history: [`User initiated goal: "${goal}" with prompt: "${prompt}"`],
  };

  console.log('[Router] Initialized new context:', context);
  return context;
}