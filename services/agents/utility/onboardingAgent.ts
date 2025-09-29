// /services/agents/utility/onboardingAgent.ts

import { IAgent, AgentResponse } from '../agentUtils';
import { ConversationContext } from '../router';

/**
 * A state-driven agent to guide new users through the onboarding process.
 * It asks for information one piece at a time.
 */
export default class OnboardingAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[OnboardingAgent] Executing...');
    let collected_info = { ...context.collected_info };

    // --- State Machine Logic ---
    // If we have a prompt, it's the user's answer to our last question.
    if (prompt) {
      if (!collected_info.name) {
        collected_info.name = prompt;
      } else if (!collected_info.accountId) {
        collected_info.accountId = prompt;
      } else if (!collected_info.privateKey) {
        collected_info.privateKey = prompt;
      }
    }

    // --- Determine Next Step ---
    if (!collected_info.name) {
      return this.requestInfo(context, "Welcome to Hedera AI! To get started, what should I call you?");
    }

    if (!collected_info.accountId) {
      return this.requestInfo({ ...context, collected_info }, `Nice to meet you, ${collected_info.name}! Now, please provide your Hedera Account ID (e.g., 0.0.12345).`);
    }

    if (!collected_info.privateKey) {
      // In a real app, you'd add more warnings about security here.
      return this.requestInfo({ ...context, collected_info }, "Great. Lastly, please provide your private key. This will be stored securely on your device and is needed to sign transactions.");
    }
    
    // --- Completion ---
    // If we have all the info, we complete the goal.
    console.log('[OnboardingAgent] Onboarding complete.');
    return {
      status: 'COMPLETE',
      speech: "Perfect, you're all set up! I've saved your credentials securely on this device. How can I help you first?",
      ui: {
        type: 'TEXT',
        props: {
          title: "Setup Complete!",
          text: `Welcome, ${collected_info.name}. Your account is now linked.`
        }
      },
      action: {
        type: 'SAVE_CREDENTIALS',
        payload: {
          name: collected_info.name,
          accountId: collected_info.accountId,
          privateKey: collected_info.privateKey,
        }
      },
      context: {
        ...context,
        collected_info,
        status: 'complete',
        history: [...context.history, 'Onboarding completed successfully.'],
      },
    };
  }

  /**
   * Helper function to create a standardized response when asking the user for more information.
   */
  private requestInfo(context: ConversationContext, speech: string): AgentResponse {
    return {
      // The agent's turn is NOT complete. It's waiting for the user.
      status: 'AWAITING_INPUT',
      speech: speech,
      ui: {
        type: 'TEXT', // A simple text prompt, the UI will have an input field
        props: {
          title: "Onboarding",
          text: speech,
        }
      },
      // This action tells the router to wait for the user's next message
      // and route it back to THIS agent.
      action: { type: 'REQUEST_USER_INPUT' },
      context: {
        ...context,
        status: 'awaiting_user_input', // The overall GOAL status is now paused.
        history: [...context.history, `Onboarding agent is waiting for user input.`],
      },
    };
  }
}