// /services/agents/onboarding/onboardingAgent.ts

import { AgentResponse, IAgent } from '../agentUtils';
import { ConversationContext } from '../router';

// This is the "shape" of the information this agent needs to collect.
const REQUIRED_INFO = ["name", "accountId", "privateKey"]; // We'll skip password/face for now to keep it simple

export default class OnboardingAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[OnboardingAgent] Executing...');
    let updatedContext = { ...context };

    // --- State Logic: Figure out what we need to do next ---

    // 1. Check if this is the first time the agent is running in this flow.
    const isFirstRun = !context.collected_info.onboarding_step;
    if (isFirstRun) {
      updatedContext.collected_info.onboarding_step = REQUIRED_INFO[0];
    } else {
      // 2. If not the first run, save the user's last input.
      const currentStep = context.collected_info.onboarding_step;
      updatedContext.collected_info[currentStep] = prompt; // Save the user's answer
      
      // 3. Find the next piece of information we need.
      const currentIndex = REQUIRED_INFO.indexOf(currentStep);
      const nextStep = REQUIRED_INFO[currentIndex + 1]; // Will be `undefined` if we are done
      updatedContext.collected_info.onboarding_step = nextStep;
    }

    const nextInfoToCollect = updatedContext.collected_info.onboarding_step;
    
    // --- Response Generation ---

    if (nextInfoToCollect) {
      // If we still have info to collect, ask the next question.
      return this.generateQuestionResponse(nextInfoToCollect, updatedContext);
    } else {
      // If we have collected everything, generate the final success response.
      return this.generateCompletionResponse(updatedContext);
    }
  }

  /**
   * Generates a UARP response to ask the user for a specific piece of information.
   */
  private generateQuestionResponse(infoNeeded: string, context: ConversationContext): AgentResponse {
    let speech = '';
    let uiProps: { [key: string]: any } = {};

    switch (infoNeeded) {
      case 'name':
        speech = "Welcome to Hedera AI. To get started, what should I call you?";
        uiProps = { placeholder: 'Enter your name...' };
        break;
      case 'accountId':
        speech = `Nice to meet you, ${context.collected_info.name}! Now, I need your Hedera account ID to continue.`;
        uiProps = { placeholder: 'e.g., 0.0.12345' };
        break;
      case 'privateKey':
        speech = "Great. Lastly, please provide your private key. Don't worry, it will never be stored on my servers and will be saved encrypted on your device.";
        uiProps = { placeholder: 'Enter your private key...', type: 'password' };
        break;
    }

    return {
      status: 'AWAITING_INPUT',
      speech: speech,
      ui: {
        type: 'INPUT',
        props: { ...uiProps, buttonText: 'Continue' },
      },
      action: { type: 'REQUEST_USER_INPUT' },
      context: {
        ...context,
        status: 'awaiting_user_input',
        history: [...context.history, `OnboardingAgent is requesting '${infoNeeded}'.`],
      },
    };
  }

  /**
   * Generates the final UARP response when onboarding is complete.
   */
  private generateCompletionResponse(context: ConversationContext): AgentResponse {
    const { name, accountId, privateKey } = context.collected_info;
    
    return {
      status: 'COMPLETE',
      speech: `All set, ${name}! I've securely saved your credentials. You can now ask me to check your balance, view your history, and more. What would you like to do?`,
      ui: {
        type: 'TEXT',
        props: {
          title: 'Setup Complete!',
          text: 'Your credentials have been securely stored on this device.',
        },
      },
      // THIS IS THE CRITICAL NEW ACTION
      action: {
        type: 'SAVE_CREDENTIALS',
        payload: {
          name,
          accountId,
          privateKey,
        },
      },
      context: {
        ...context,
        status: 'complete',
        goal: 'onboarding_complete', // Mark the goal as done
        history: [...context.history, 'OnboardingAgent completed successfully.'],
      },
    };
  }
}