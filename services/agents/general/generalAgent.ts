// /services/agents/general/generalAgent.ts

import { IAgent, AgentResponse, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { AGENT_REGISTRY } from '../registry';
import { geminiModel } from '../../geminiServices';

export default class GeneralAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[GeneralAgent] Executing...');

    // This logic remains correct: Plan if there are no results, otherwise Synthesize.
    if (context.collected_info.specialist_results) {
      console.log('[GeneralAgent] Detected specialist results. Entering synthesis mode.');
      return this.synthesize(prompt, context);
    } else {
      console.log('[GeneralAgent] No specialist results found. Entering planning mode.');
      return this.plan(prompt, context);
    }
  }

  /**
   * PHASE 1: PLANNING
   * The agent analyzes the user's prompt and its own context to create a plan.
   */
  private async plan(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    try {
      const specialistAgents = Object.entries(AGENT_REGISTRY)
        .filter(([key]) => key !== 'general/generalAgent')
        .map(([key, value]) => `- ${key}: ${value.description}`)
        .join('\n');

      // *** CRITICAL FIX: The prompt is now much more robust and context-aware. ***
      const llmPrompt = `
        You are "Hedera AI", a master AI orchestrator for the Hedera network. Your primary function is to understand a user's request, check your existing knowledge, and create a precise execution plan.

        **Your Current Knowledge (from context):**
        - User Name: ${context.collected_info.name || 'Not available'}
        - User AccountID: ${context.collected_info.accountId || 'Not available'}
        - Long-Term Memory: ${JSON.stringify(context.collected_info.long_term_memory) || '{}'}

        **Your Thought Process (Follow these steps strictly):**
        1.  **Analyze the User's Goal:** What does the user want to achieve with their latest prompt?
        2.  **Check Your Knowledge FIRST:** Look at your "Current Knowledge" above. Do you already have the information needed to fulfill the request? For example, if the user asks for their balance, check if you have their 'User AccountID'.
        3.  **Consult Your Tools:** Based on the user's goal and your existing knowledge, look at the "Available Specialist Agents" list. Decide which tool, if any, is required.
        4.  **Formulate a Plan:**
            -   **If a tool is needed AND you have the prerequisites** (e.g., you need 'wallet/balanceAgent' and you have the 'User AccountID'), your plan is to delegate. The action type will be 'DELEGATE' or 'DELEGATE_PARALLEL'.
            -   **If a tool is needed BUT you LACK prerequisites** (e.g., the user wants their history but 'User AccountID' is 'Not available'), your plan is to delegate to 'utility/onboardingAgent' to collect the missing info. THIS IS A LAST RESORT.
            -   **If NO tools are needed** (e.g., for greetings like "how are you", or questions you can answer directly), your plan is to respond immediately. The action type will be 'COMPLETE_GOAL'.

        **Your Response MUST be a valid UARP JSON object only.**

        **UARP Schema for Planning:**
        {
          "speech": "A brief, conversational message to the user indicating you've understood and are starting to work.",
          "ui": { "type": "LOADING", "props": { "text": "Processing..." } },
          "action": {
            "type": "'COMPLETE_GOAL' | 'DELEGATE' | 'DELEGATE_PARALLEL'",
            "payload": "(Required for DELEGATE actions) An object or array of objects: { agent: string, prompt: string }"
          }
        }

        **Available Specialist Agents (Your Tools):**
        ${specialistAgents}
        
        **CRITICAL RULE:** Do NOT delegate to 'utility/onboardingAgent' if you already have the 'User AccountID'.

        ---
        **User's Request:** "${prompt}"
        ---

        Now, generate the UARP JSON plan based on your rigorous thought process.
      `;

      const result = await geminiModel.generateContent(llmPrompt);
      const rawResponseText = result.response.text();
      console.log("[GeneralAgent-Plan] Raw LLM Response:", rawResponseText);
      const responseJson = JSON.parse(extractJsonFromResponse(rawResponseText));

      return {
        status: responseJson.action.type === 'COMPLETE_GOAL' ? 'COMPLETE' : 'DELEGATING',
        speech: responseJson.speech,
        ui: responseJson.ui,
        action: responseJson.action,
        context: {
          ...context,
          status: 'delegating', // Set status to delegating if a plan is made
          history: [...context.history, `GeneralAgent created a plan: ${responseJson.action.type}`],
        },
      };

    } catch (error: any) {
      console.error('[GeneralAgent-Plan] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  /**
   * PHASE 2: SYNTHESIS (No changes needed here, logic is sound)
   * The agent receives the results and weaves them into a coherent response.
   */
  private async synthesize(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    try {
        const specialistResults = context.collected_info.specialist_results;
  
        const llmPrompt = `
          You are "Hedera AI", a master AI synthesizer. Your specialist agents have completed their tasks and returned raw data. Your job is to transform this data into a single, coherent, and friendly response for the user.
  
          **Your Thought Process:**
          1.  **Review the Original Goal:** The user's initial request was: "${context.collected_info.originalPrompt}".
          2.  **Analyze the Data:** Examine the JSON data returned by your specialist agents. Note any successes or errors.
          3.  **Craft the Narrative:** Formulate a conversational "speech" that summarizes all the findings. If there was an error, explain it kindly.
          4.  **Design the UI:** Combine the UI components from the specialist results into a single, rich UI. Use a "LAYOUT_STACK".
  
          **Your Response MUST be a valid UARP JSON object only.**
  
          ---
          **Data from Specialist Agents:**
          ${JSON.stringify(specialistResults, null, 2)}
          ---
  
          Now, generate the final UARP JSON response for the user.
        `;
  
        const result = await geminiModel.generateContent(llmPrompt);
        const rawResponseText = result.response.text();
        console.log("[GeneralAgent-Synthesize] Raw LLM Response:", rawResponseText);
        const responseJson = JSON.parse(extractJsonFromResponse(rawResponseText));
  
        return {
          status: 'COMPLETE',
          speech: responseJson.speech,
          ui: responseJson.ui,
          action: { type: 'COMPLETE_GOAL' },
          context: {
            ...context,
            status: 'complete',
            history: [...context.history, 'GeneralAgent synthesized specialist results.'],
          },
        };
  
      } catch (error: any) {
        console.error('[GeneralAgent-Synthesize] Error:', error);
        return this.createErrorResponse(context, error.message);
      }
  }

  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I seem to have hit a snag while processing that. Could you try rephrasing?",
      ui: { type: 'TEXT', props: { title: "Cognitive Error", text: `Details: ${errorMessage}` } },
      action: { type: 'COMPLETE_GOAL' },
      context: { ...context, status: 'failed', history: [...context.history, `GeneralAgent failed: ${errorMessage}`] },
    };
  }
}