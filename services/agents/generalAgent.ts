import { IAgent, AgentResponse, extractJsonFromResponse } from './agentUtils';
import { ConversationContext } from './router';
import { AGENT_REGISTRY } from './registry';
import { geminiModel } from '../geminiServices';

export default class GeneralAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[GeneralAgent] Executing...');

    try {
      // Check if this is a synthesis step (i.e., we have results from specialist agents)
      if (context.collected_info.parallel_results) {
        console.log('[GeneralAgent] Results received. Synthesizing final response.');
        return await this._synthesizeResults(prompt, context);
      }

      // Otherwise, this is a new request that needs planning
      console.log('[GeneralAgent] New request received. Planning next action.');
      return await this._planNextAction(prompt, context);

    } catch (error: any) {
      console.error('[GeneralAgent] Error:', error);
      return this.createErrorResponse(context, error.message);
    }
  }

  /**
   * PHASE 1: PLANNING
   * Analyzes the user's prompt and decides on the next action(s).
   * This could be a simple conversational reply, or delegation to one or more specialist agents.
   */
  private async _planNextAction(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    const specialistAgents = Object.entries(AGENT_REGISTRY)
      .filter(([key]) => !key.startsWith('general/') && !key.startsWith('utility/unknown'))
      .map(([key, value]) => `- ${key}: ${value.description}`)
      .join('\n');

    const planningPrompt = `
      You are "Hedera AI", the master orchestrator for a Hedera wallet assistant.
      Your primary role is to understand a user's request, create a plan, and delegate tasks to specialist agents.

      **Your Task:**
      Analyze the user's prompt and decide on the best course of action.
      You must respond with a JSON object representing your plan.

      **Available Specialist Agents (Tools):**
      ${specialistAgents}

      **Possible Actions:**
      1.  **SIMPLE_RESPONSE:** If the prompt is conversational (e.g., "hello", "thank you") and requires no tools.
      2.  **DELEGATE_SINGLE_TASK:** If the prompt requires exactly one specialist agent.
      3.  **DELEGATE_PARALLEL_TASKS:** If the prompt is complex and requires multiple specialist agents to be run at the same time.

      **Your Response MUST be a valid JSON object in this format:**
      {
        "thought": "A brief, step-by-step thought process on how you analyzed the prompt and chose your action.",
        "action_type": "SIMPLE_RESPONSE" | "DELEGATE_SINGLE_TASK" | "DELEGATE_PARALLEL_TASKS",
        "speech": "An initial, brief holding message for the user, like 'Okay, let me check that for you.' or 'Hello! How can I help?'.",
        "ui": { "type": "LOADING", "props": { "text": "Processing..." } },
        "delegations": [
          { "agent": "agent_name", "prompt": "a clear, specific prompt for the specialist" }
        ]
      }

      **Rules:**
      - For "SIMPLE_RESPONSE", the "delegations" array must be empty.
      - For "DELEGATE_SINGLE_TASK", the "delegations" array must have exactly one item.
      - For "DELEGATE_PARALLEL_TASKS", the "delegations" array can have multiple items.
      - Be very specific in the "prompt" you create for the specialist agents.

      **User Prompt:** "${prompt}"

      Now, generate your JSON plan.
    `;

    const result = await geminiModel.generateContent(planningPrompt);
    const rawResponseText = result.response.text();
    console.log("[GeneralAgent] Raw Planning Response:", rawResponseText);
    const plan = JSON.parse(extractJsonFromResponse(rawResponseText));

    // Construct the UARP response based on the LLM's plan
    let responseAction: any;
    let responseStatus: "COMPLETE" | "DELEGATING" = "DELEGATING";

    switch (plan.action_type) {
      case 'SIMPLE_RESPONSE':
        responseAction = { type: 'COMPLETE_GOAL' };
        responseStatus = 'COMPLETE';
        break;
      case 'DELEGATE_SINGLE_TASK':
        responseAction = {
          type: 'DELEGATE',
          payload: plan.delegations[0],
        };
        break;
      case 'DELEGATE_PARALLEL_TASKS':
        responseAction = {
          type: 'DELEGATE_PARALLEL',
          payload: plan.delegations,
        };
        break;
      default:
        throw new Error(`Invalid action_type from planning model: ${plan.action_type}`);
    }

    return {
      status: responseStatus,
      speech: plan.speech,
      ui: plan.ui,
      action: responseAction,
      context: {
        ...context,
        status: 'delegating', // We are now in a delegating state
        history: [...context.history, `GeneralAgent planned to ${plan.action_type}. Thought: ${plan.thought}`],
      },
    };
  }

  /**
   * PHASE 2: SYNTHESIS
   * Takes the raw data from specialist agents and weaves it into a single,
   * coherent, and user-friendly response.
   */
  private async _synthesizeResults(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    const originalPrompt = context.collected_info.originalPrompt;
    const specialistResults = JSON.stringify(context.collected_info.parallel_results, null, 2);

    const synthesisPrompt = `
      You are "Hedera AI", the master orchestrator for a Hedera wallet assistant.
      Your specialist agents have completed their tasks and returned raw data.
      Your job is to synthesize this information into a single, final, user-friendly response.

      **The User's Original Request Was:** "${originalPrompt}"

      **The Raw Data from Your Specialist Agents Is:**
      ${specialistResults}

      **Your Task:**
      1.  **Craft a conversational 'speech'** that summarizes all the information in a natural and helpful way.
      2.  **Design a comprehensive 'ui' object** using the "Grammar of UI". You can use LAYOUT components to combine multiple pieces of information (like cards, lists, or text) into one view.
      3.  Respond with a complete UARP JSON object.

      **Your Response MUST be a valid JSON object in this format:**
      {
        "speech": "Your final, conversational summary for the user.",
        "ui": {
          "type": "LAYOUT_STACK" | "CARD" | "LIST" | "TEXT",
          "props": { ... }
        }
      }

      Now, generate the final JSON response.
    `;

    const result = await geminiModel.generateContent(synthesisPrompt);
    const rawResponseText = result.response.text();
    console.log("[GeneralAgent] Raw Synthesis Response:", rawResponseText);
    const finalResponse = JSON.parse(extractJsonFromResponse(rawResponseText));

    return {
      status: 'COMPLETE',
      speech: finalResponse.speech,
      ui: finalResponse.ui,
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'complete',
        history: [...context.history, `GeneralAgent successfully synthesized results.`],
      },
    };
  }

  /**
   * Creates a standardized error response.
   */
  private createErrorResponse(context: ConversationContext, errorMessage: string): AgentResponse {
    return {
      status: 'COMPLETE',
      speech: "I seem to have run into a bit of a snag. My apologies. Could you please try rephrasing your request?",
      ui: {
        type: 'TEXT',
        props: {
          title: "Orchestration Error",
          text: `An error occurred in the General Agent: ${errorMessage}`,
        },
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'failed',
        history: [...context.history, `GeneralAgent failed: ${errorMessage}`],
      },
    };
  }
}