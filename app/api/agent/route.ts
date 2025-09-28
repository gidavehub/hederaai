// /app/api/agent/route.ts

import { NextResponse } from 'next/server';
// We import the main entry point to your agent system from geminiServices.ts
import { processUserPrompt } from '../../../services/geminiServices';
// We import the ConversationContext type to ensure type safety
import type { ConversationContext } from '../../../services/agents/router';

/**
 * The primary API route for interacting with the Hedera AI agent system.
 * It receives the user's prompt and the current conversation context,
 * routes it through the agent framework, and returns the UARP response.
 */
export async function POST(request: Request) {
  try {
    // 1. Parse the incoming request from the client
    const body = await request.json();
    const { prompt, context } = body;

    // Basic validation
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    // The context can be null for the first message in a conversation
    const currentContext: ConversationContext | null = context || null;

    console.log('[API /agent] Received prompt:', prompt);
    console.log('[API /agent] Received context:', currentContext);

    // 2. Call the agent system's main entry point
    // This single function call kicks off the entire router -> agent -> LLM -> UARP flow
    const uarpResponse = await processUserPrompt(prompt, currentContext);
    
    console.log('[API /agent] Sending UARP response to client:', uarpResponse);

    // 3. Return the complete UARP response to the client
    return NextResponse.json(uarpResponse);

  } catch (error: any) {
    console.error('[API /agent] An unexpected error occurred:', error);

    // Return a structured error response that the frontend can handle
    return NextResponse.json(
      {
        status: 'ERROR',
        speech: "I've encountered a critical server error. My apologies. Please try again later.",
        ui: {
          type: 'TEXT',
          props: {
            title: 'System Error',
            text: error.message || 'An unknown error occurred on the server.',
          },
        },
        context: null, // Reset context on critical failure
      },
      { status: 500 }
    );
  }
}