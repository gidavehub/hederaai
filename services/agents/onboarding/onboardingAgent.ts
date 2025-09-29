// /services/agents/onboarding/onboardingAgent.ts

import { AgentResponse, IAgent } from '../agentUtils';
import { ConversationContext } from '../router';

// This is the "shape" of the information this agent needs to collect.
const REQUIRED_INFO = ["name", "accountId", "privateKey"];

export default class OnboardingAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[OnboardingAgent] Executing...');
    let updatedContext = { ...context };

    // --- State Logic (Unchanged) ---
    const isFirstRun = !context.collected_info.onboarding_step;
    if (isFirstRun) {
      updatedContext.collected_info.onboarding_step = REQUIRED_INFO[0];
    } else {
      const currentStep = context.collected_info.onboarding_step;
      updatedContext.collected_info[currentStep] = prompt;
      
      const currentIndex = REQUIRED_INFO.indexOf(currentStep);
      const nextStep = REQUIRED_INFO[currentIndex + 1];
      updatedContext.collected_info.onboarding_step = nextStep;
    }

    const nextInfoToCollect = updatedContext.collected_info.onboarding_step;
    
    // --- Response Generation ---
    if (nextInfoToCollect) {
      return this.generateQuestionResponse(nextInfoToCollect, updatedContext);
    } else {
      return this.generateCompletionResponse(updatedContext);
    }
  }

  /**
   * Generates a UARP response to ask the user for a specific piece of information.
   * *** THIS AGENT IS NOW "UI AWARE" ***
   */
  private generateQuestionResponse(infoNeeded: string, context: ConversationContext): AgentResponse {
    let speech = '';
    let uiProps: { [key: string]: any } = {};
    
    // Determine the current step for the Stepper UI
    const currentStep = REQUIRED_INFO.indexOf(infoNeeded) + 1;
    const totalSteps = REQUIRED_INFO.length;

    switch (infoNeeded) {
      case 'name':
        speech = "Welcome to Hedera AI. To get started, what should I call you?";
        uiProps = { title: "What is your name?", placeholder: 'Enter your name...' };
        break;
      case 'accountId':
        speech = `Nice to meet you, ${context.collected_info.name}! Now, please provide your Hedera account ID.`;
        uiProps = { title: "Provide Hedera Account ID", placeholder: 'e.g., 0.0.12345' };
        break;
      case 'privateKey':
        speech = "Great. Lastly, please provide your private key. It will be saved encrypted on your device and never sent to a server.";
        uiProps = { title: "Enter Private Key", placeholder: 'Your key is kept safe locally' };
        break;
    }

    return {
      status: 'AWAITING_INPUT',
      speech: speech,
      // **THE FIX**: This agent now constructs a rich UI using LAYOUT_STACK and STEPPER.
      // It combines a progress indicator with the input prompt for a superior user experience.
      ui: {
        type: 'LAYOUT_STACK',
        props: {
          children: [
            {
              type: 'STEPPER',
              props: {
                currentStep: currentStep,
                totalSteps: totalSteps,
                title: 'Onboarding'
              }
            },
            {
              type: 'INPUT',
              props: uiProps,
            }
          ]
        }
      },
      action: { type: 'REQUEST_USER_INPUT' },
      context: {
        ...context,
        status: 'awaiting_user_input',
        history: [...context.history, `OnboardingAgent is requesting '${infoNeeded}' (Step ${currentStep}/${totalSteps}).`],
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
        type: 'KEY_VALUE_DISPLAY', // Already using a rich component, which is great.
        props: {
          title: 'Setup Complete!',
          items: [
            { key: "Name", value: name },
            { key: "Account ID", value: accountId },
            { key: "Status", value: "Credentials saved locally." }
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