// /services/geminiServices.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { routeRequest } from './agents/router';
import type { ConversationContext } from './agents/agentUtils';

// Validate that the Gemini API key is set in the environment variables.
if (!process.env.GEMINI_API_KEY) {
  throw new Error("CRITICAL: GEMINI_API_KEY is not set in environment variables.");
}

// Initialize the Google Generative AI client.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Export the model instance so that individual agents (like GeneralAgent, BalanceAgent)
// can use it for their specific LLM-powered tasks.
// Using a slightly more capable model is good for the complex reasoning of the GeneralAgent.
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * The single, top-level entry point for the entire AI agent system.
 * It receives the user's prompt and the current conversation context from the API layer,
 * and passes it to the router to begin the processing chain.
 *
 * @param {string} prompt - The raw text input from the user for this turn.
 * @param {ConversationContext | null} context - The state of the conversation from the previous turn. Null if it's a new conversation.
 * @returns {Promise<any>} A promise that resolves to the final UARP response from the agent system.
 */
export async function processUserPrompt(
  prompt: string,
  context: ConversationContext | null
): Promise<any> {
  console.log(`[GeminiServices] Processing prompt: "${prompt}"`);

  // This function now acts as a clean, simple gateway.
  // All complex logic for state management, planning, and orchestration
  // is now handled by the router and the agents.
  try {
    const agentSystemResponse = await routeRequest(prompt, context);
    return agentSystemResponse;
  } catch (error) {
    console.error("[GeminiServices] A critical, unhandled error occurred in the agent system:", error);

    // This is the final safety net. If the router or an agent throws an unexpected
    // error that isn't caught, this will prevent the server from crashing and
    // will return a structured error message to the user.
    return {
      status: 'ERROR',
      speech: "Oh dear, something went very wrong deep in my circuits. We might need to start over.",
      ui: {
        type: 'TEXT',
        props: {
          title: "Critical System Error",
          text: "A critical and unexpected error occurred. Please try again later."
        }
      },
      action: { type: 'COMPLETE_GOAL' },
      context: context ? { ...context, status: 'failed' } : null,
    };
  }
}