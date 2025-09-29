// /services/agents/onboarding/onboardingAgent.ts

import { AgentResponse, IAgent, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../geminiServices';

// This is the "shape" of the information this agent needs to collect.
const REQUIRED_INFO = ["name", "accountId", "privateKey"];

export default class OnboardingAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[OnboardingAgent V2] Executing with AI-driven UI generation...');
    let updatedContext = { ...context };

    // --- State Logic: Save the previous prompt if it was an answer ---
    if (context.collected_info.onboarding_step) {
      const currentStep = context.collected_info.onboarding_step;
      updatedContext.collected_info[currentStep] = prompt;
    }

    // --- AI-Driven UI Generation ---
    // 1. Find the first piece of required information that we don't have.
    const nextInfoToCollect = REQUIRED_INFO.find(info => !updatedContext.collected_info[info]);

    if (nextInfoToCollect) {
      // 2. If we need more info, ask the AI to generate the next question and UI.
      return this.generateAIQuestionResponse(nextInfoToCollect, updatedContext);
    } else {
      // 3. If we have everything, generate the final success response.
      return this.generateCompletionResponse(updatedContext);
    }
  }

  /**
   * Generates a UARP response by asking an LLM to design the UI for the next question.
   */
  private async generateAIQuestionResponse(infoNeeded: string, context: ConversationContext): Promise<AgentResponse> {
    
    const currentStep = REQUIRED_INFO.indexOf(infoNeeded) + 1;
    const totalSteps = REQUIRED_INFO.length;

    // This is the new "brain" of the agent. It's an instruction set for the LLM.
    const llmPrompt = `
      You are a friendly and efficient Onboarding AI Assistant for "Hedera AI".
      Your goal is to collect a user's name, Hedera account ID, and private key, one step at a time, by generating a complete UARP JSON response.

      **Your UI Design Palette (The components you MUST use):**
      - **'LAYOUT_STACK'**: The main container for showing multiple components.
      - **'STEPPER'**: A visual indicator of progress. Props: { currentStep: number, totalSteps: number, title: string }.
      - **'TEXT_INPUT'**: The component for asking for user input. It renders a title, a text field, and a submit button. Props: { title: string, placeholder: string, buttonText: string }.

      **Your Thought Process:**
      1.  Look at the "Information to Collect" and the "User's Current Info".
      2.  Formulate a friendly, conversational 'speech' message to ask for the required information. DO NOT repeat the question text in the speech. The speech is a guide, the UI is the action.
      3.  Design the 'ui' object using your UI Design Palette.
          - ALWAYS use a 'LAYOUT_STACK' as the root UI element.
          - ALWAYS include a 'STEPPER' to show the user their progress.
          - ALWAYS include a 'TEXT_INPUT' component to ask the question and provide a way to submit. Make the 'title' a clear question. Use a helpful 'placeholder' and a clear 'buttonText' like "Continue" or "Submit".

      **Your Response MUST be only the raw UARP JSON object.**

      ---
      **CONTEXT FOR THIS TURN:**
      - **Information to Collect This Turn:** "${infoNeeded}"
      - **Current Step:** ${currentStep} of ${totalSteps}
      - **User's Current Info:** ${JSON.stringify(context.collected_info)}
      ---

      Now, generate the complete UARP JSON to ask the user for the "${infoNeeded}".
    `;

    try {
      const result = await geminiModel.generateContent(llmPrompt);
      const rawResponseText = result.response.text();
      console.log("[OnboardingAgent-AI] Raw LLM Response:", rawResponseText);
      const responseJson = JSON.parse(extractJsonFromResponse(rawResponseText));

      return {
        status: 'AWAITING_INPUT',
        speech: responseJson.speech,
        ui: responseJson.ui,
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          collected_info: {
            ...context.collected_info,
            onboarding_step: infoNeeded, // Set the step for the next turn
          },
          status: 'awaiting_user_input',
          history: [...context.history, `OnboardingAgent is AI-requesting '${infoNeeded}'.`],
        },
      };
    } catch (error: any) {
      console.error('[OnboardingAgent-AI] Error:', error);
      // Fallback to a simple error message if the AI fails
      return {
        status: 'COMPLETE',
        speech: "I'm having a little trouble setting up. Please try again in a moment.",
        ui: { type: 'TEXT', props: { title: "Onboarding Error", text: error.message } },
        action: { type: 'COMPLETE_GOAL' },
        context: { ...context, status: 'failed' },
      };
    }
  }

  /**
   * Generates the final UARP response when onboarding is complete. (Unchanged)
   */
  private generateCompletionResponse(context: ConversationContext): AgentResponse {
    const { name, accountId, privateKey } = context.collected_info;
    
    return {
      status: 'COMPLETE',
      speech: `All set, ${name}! I've securely saved your credentials. You can now use the Nexus Bar to command the network.`,
      ui: {
        type: 'KEY_VALUE_DISPLAY',
        props: {
          title: 'Setup Complete!',
          items: [
            { key: "Name", value: name },
            { key: "Account ID", value: accountId },
            { key: "Status", value: "Credentials saved and encrypted locally." }
          ]
        },
      },
      action: {
        type: 'SAVE_CREDENTIALS',
        payload: { name, accountId, privateKey },
      },
      context: {
        ...context,
        status: 'complete',
        goal: 'onboarding_complete',
        history: [...context.history, 'OnboardingAgent completed successfully.'],
      },
    };
  }
}