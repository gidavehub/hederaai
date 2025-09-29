// /services/agents/router.ts

import { callAgent, AgentResponse } from './agentUtils';

/**
 * The main entry point for routing all user requests.
 *
 * REFINED ARCHITECTURE V2:
 * 1. Gatekeeper: Handles onboarding and multi-turn conversations in progress.
 * 2. Mandatory Delegation to GeneralAgent: All new prompts are ALWAYS sent to the GeneralAgent for planning.
 * 3. Execution Loop: The Router acts as an executor for the GeneralAgent's plans.
 * 4. Synthesis Loop: Results are sent BACK to the GeneralAgent for synthesis.
 */

export type ConversationContext = {
  goal: string | null;
  status: 'pending' | 'awaiting_user_input' | 'delegating' | 'complete' | 'failed';
  collected_info: { [key: string]: any };
  call_stack: string[];
  history: string[];
};


export async function routeRequest(prompt: string, context: ConversationContext | null): Promise<AgentResponse> {
  // --- 1. GATEKEEPER & CONTINUITY LOGIC ---

  if (!context || !context.collected_info.accountId) {
    console.log('[Router] New user detected. Forcing onboarding.');
    // We haven't created onboardingAgent yet, so return a placeholder. This avoids the crash.
    // In a real scenario, this would call the actual agent.
    if (!prompt) { // Initial load before user has typed anything
      const onboardingContext = initializeContext('utility/onboardingAgent', "Begin Onboarding");
      return callAgent('utility/onboardingAgent', "Begin Onboarding", onboardingContext);
    }
    // If a logged-out user types something, the GeneralAgent should handle it.
    // We will let it fall through for now, assuming login is handled on the frontend.
  }

  if (context && context.status === 'awaiting_user_input') {
    console.log('[Router] Continuing an existing multi-turn interaction.');
    const activeAgentName = context.call_stack[context.call_stack.length - 1];
    return callAgent(activeAgentName, prompt, context);
  }

  // --- 2. NEW REQUEST: ALWAYS DELEGATE TO GENERAL AGENT FOR PLANNING ---

  console.log('[Router] New request. Passing to GeneralAgent for planning.');
  
  // *** CRITICAL FIX: Sanitize the context before starting a new plan. ***
  const planContext = initializeContext('general/generalAgent', prompt, context.collected_info);
  
  const planResponse = await callAgent('general/generalAgent', prompt, planContext);

  // --- 3. EXECUTION & SYNTHESIS LOGIC (Delegation Logic) ---

  const actionType = planResponse.action?.type;

  if (actionType === 'DELEGATE' || actionType === 'DELEGATE_PARALLEL') {
    console.log(`[Router] GeneralAgent planned a ${actionType} action. Executing tasks.`);
    
    const tasks = actionType === 'DELEGATE' 
      ? [planResponse.action.payload] 
      : planResponse.action.payload;

    if (!tasks || tasks.length === 0) {
        console.error("[Router] DELEGATE action received with no tasks. Completing goal.");
        return { ...planResponse, action: { type: 'COMPLETE_GOAL' }};
    }

    const specialistPromises = tasks.map((task: any) =>
      callAgent(task.agent, task.prompt, planResponse.context)
    );
    const specialistResults = await Promise.all(specialistPromises);

    const synthesisContext: ConversationContext = {
      ...planResponse.context,
      status: 'pending',
      collected_info: {
        ...planResponse.context.collected_info,
        specialist_results: specialistResults, // Pass the full results, including any errors
      },
      history: [...planResponse.context.history, 'All specialist tasks completed. Preparing for synthesis.'],
    };

    console.log('[Router] All specialists finished. Calling GeneralAgent for synthesis.');
    return await callAgent('general/generalAgent', prompt, synthesisContext);
  }

  // If the action is not a delegation, return the GeneralAgent's direct response.
  console.log('[Router] GeneralAgent handled request directly. Returning its response.');
  return planResponse;
}


/**
 * **CONTEXT SANITIZER**
 * Creates a new, clean conversation context for the start of a request flow.
 * It purposefully ONLY carries over essential, long-term user information.
 */
function initializeContext(
  agentName: string,
  prompt: string,
  existingInfo: { [key:string]: any } = {}
): ConversationContext {
  
  // This is the sanitization step. We create a new object with only the keys we want to preserve.
  const preservedInfo = {
    name: existingInfo.name,
    accountId: existingInfo.accountId,
    long_term_memory: existingInfo.long_term_memory,
    // CRITICAL: We explicitly DO NOT copy keys like 'specialist_results' or 'originalPrompt' from the previous turn.
  };

  const context: ConversationContext = {
    goal: agentName.split('/')[1].replace('Agent', ''),
    status: 'pending',
    collected_info: { ...preservedInfo, originalPrompt: prompt }, // Add the new originalPrompt
    call_stack: [agentName],
    history: [`User initiated goal with prompt: "${prompt}"`],
  };

  console.log('[Router] Initialized new SANITIZED context:', context);
  return context;
}