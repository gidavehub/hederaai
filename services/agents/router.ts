// /services/agents/router.ts

import { callAgent, AgentResponse } from './agentUtils';

/**
 * The main entry point for routing all user requests.
 *
 * REFINED ARCHITECTURE V3:
 * 1. Gatekeeper: Handles onboarding and multi-turn conversations in progress.
 * 2. Mandatory Delegation to GeneralAgent: All new prompts are ALWAYS sent to the GeneralAgent for planning.
 * 3. Generalized Execution Loop: The Router can now execute a `DELEGATE` action from ANY agent.
 * 4. Intelligent Resume Loop: Results are sent BACK to the original delegating agent for processing.
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

  // On first-ever load, force onboarding.
  if (!context || !context.collected_info.accountId) {
    if (!prompt) { // Initial load before user has typed anything
      console.log('[Router] New user detected. Forcing onboarding.');
      const onboardingContext = initializeContext('utility/onboardingAgent', "Begin Onboarding");
      return callAgent('utility/onboardingAgent', "Begin Onboarding", onboardingContext);
    }
  }

  // If we are in the middle of a multi-turn conversation, continue with that agent.
  if (context && context.status === 'awaiting_user_input') {
    console.log('[Router] Continuing an existing multi-turn interaction.');
    const activeAgentName = context.call_stack[context.call_stack.length - 1];
    const continuedResponse = await callAgent(activeAgentName, prompt, context);

    // **CRITICAL UPGRADE**: The continuing agent might delegate. We must handle its response.
    return await processAgentResponse(continuedResponse, prompt);
  }

  // --- 2. NEW REQUEST: ALWAYS DELEGATE TO GENERAL AGENT FOR PLANNING ---

  console.log('[Router] New request. Passing to GeneralAgent for planning.');
  
  const planContext = initializeContext('general/generalAgent', prompt, context?.collected_info);
  
  const planResponse = await callAgent('general/generalAgent', prompt, planContext);

  // --- 3. EXECUTION & RESUME LOGIC (Process the response from the initial agent) ---
  return await processAgentResponse(planResponse, prompt);
}


/**
 * **The Core Execution Engine**
 * This function inspects an agent's response. If it's a simple response, it returns it.
 * If it's a DELEGATE action, it executes the sub-tasks and calls the original agent
 * back with the results for synthesis/resumption.
 */
async function processAgentResponse(agentResponse: AgentResponse, originalPrompt: string): Promise<AgentResponse> {
    const actionType = agentResponse.action?.type;

    if (actionType === 'DELEGATE' || actionType === 'DELEGATE_PARALLEL') {
        console.log(`[Router] Detected a ${actionType} action. Executing tasks.`);
        
        const tasks = actionType === 'DELEGATE' 
        ? [agentResponse.action.payload] 
        : agentResponse.action.payload;

        if (!tasks || tasks.length === 0) {
            console.error("[Router] DELEGATE action received with no tasks. Completing goal.");
            return { ...agentResponse, status: 'COMPLETE', action: { type: 'COMPLETE_GOAL' }};
        }

        const specialistPromises = tasks.map((task: any) =>
            callAgent(task.agent, task.prompt, agentResponse.context)
        );
        const specialistResults = await Promise.all(specialistPromises);

        // *** THE CRITICAL FIX STARTS HERE ***
        // Check if any specialist needs to pause the entire flow to wait for user input.
        const pausingSpecialist = specialistResults.find(res => res.status === 'AWAITING_INPUT');
        if (pausingSpecialist) {
            console.log(`[Router] A specialist (${pausingSpecialist.context.call_stack.slice(-1)[0]}) has requested user input. Pausing execution chain.`);
            // If a specialist needs to pause, we must immediately stop and return its response.
            // This prevents the infinite loop by not resuming the parent agent.
            return pausingSpecialist;
        }
        // *** THE CRITICAL FIX ENDS HERE ***

        const resumeContext: ConversationContext = {
            ...agentResponse.context,
            status: 'pending', // Reset status for the resuming agent
            collected_info: {
                ...agentResponse.context.collected_info,
                specialist_results: specialistResults,
            },
            history: [...agentResponse.context.history, 'All specialist tasks completed. Preparing to resume.'],
        };

        const resumingAgentName = agentResponse.context.call_stack[agentResponse.context.call_stack.length - 1];
        
        console.log(`[Router] All specialists finished. Calling ${resumingAgentName} to resume its flow.`);
        
        const finalResponse = await callAgent(resumingAgentName, originalPrompt, resumeContext);

        // It's possible the resumed agent delegates AGAIN, so we recursively process.
        return processAgentResponse(finalResponse, originalPrompt);
    }

    // If the action is not a delegation, the flow is complete for this turn.
    console.log(`[Router] Agent returned a final status for this turn: ${agentResponse.status}.`);
    return agentResponse;
}


/**
 * **CONTEXT SANITIZER**
 * Creates a new, clean conversation context for the start of a request flow.
 */
function initializeContext(
  agentName: string,
  prompt: string,
  existingInfo: { [key:string]: any } = {}
): ConversationContext {
  
  const preservedInfo = {
    name: existingInfo.name,
    accountId: existingInfo.accountId,
    privateKey: existingInfo.privateKey,
    password: existingInfo.password,
    long_term_memory: existingInfo.long_term_memory,
  };

  const context: ConversationContext = {
    goal: agentName.split('/')[1].replace('Agent', ''),
    status: 'pending',
    collected_info: { ...preservedInfo, originalPrompt: prompt },
    call_stack: [agentName],
    history: [`User initiated goal with prompt: "${prompt}"`],
  };

  console.log('[Router] Initialized new SANITIZED context:', context);
  return context;
}