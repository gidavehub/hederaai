// /services/agents/onboarding/onboardingAgent.ts

import { AgentResponse, IAgent } from '../agentUtils';
import { ConversationContext } from '../router';

// This is the "shape" of the information this agent needs to collect.
const REQUIRED_INFO = ["name", "password", "accountId", "privateKey"];

export default class OnboardingAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[OnboardingAgent] Executing...');
    let updatedContext = { ...context };

    // --- State Logic: Handle user responses from previous turns ---
    const currentStepKey = context.collected_info.onboarding_step;

    if (currentStepKey && currentStepKey !== 'account_id_choice') {
      updatedContext.collected_info[currentStepKey] = prompt;
    }

    // --- State Logic: Handle the choice between creating/providing an account ---
    if (currentStepKey === 'account_id_choice') {
      if (prompt === 'create_new_account') {
        // User wants a new account. Delegate to the createAccountAgent.
        return this.delegateToCreateAccount(updatedContext);
      }
      // *** THE FIX IS HERE ***
      if (prompt === 'provide_existing_account') {
        // User has an account. We must immediately ask for their account ID.
        // We clear the step to maintain a clean state.
        updatedContext.collected_info.onboarding_step = null;
        // Then, we explicitly call the next question instead of letting the logic fall through.
        return this.generateQuestionResponse('accountId', updatedContext);
      }
    }
    
    // --- State Logic: Handle resuming after account creation ---
    const createAccountResult = context.collected_info.specialist_results?.[0];
    if (createAccountResult && createAccountResult.context?.goal === 'createAccount') {
        console.log('[OnboardingAgent] Resuming from CreateAccountAgent result.');
        const { lastCreatedAccountId, lastCreatedAccountPrivateKey } = createAccountResult.context.collected_info;
        if (lastCreatedAccountId && lastCreatedAccountPrivateKey) {
            updatedContext.collected_info.accountId = lastCreatedAccountId;
            updatedContext.collected_info.privateKey = lastCreatedAccountPrivateKey;
            delete updatedContext.collected_info.specialist_results;
        }
    }

    // --- Main Logic: Find the next piece of info to collect ---
    const nextInfoToCollect = REQUIRED_INFO.find(info => !updatedContext.collected_info[info]);

    if (nextInfoToCollect) {
      // This is now the first entry point for the account ID question, triggering the choice.
      if (nextInfoToCollect === 'accountId') {
        return this.generateAccountChoiceResponse(updatedContext);
      }
      // For all other info, use the standard question generator.
      return this.generateQuestionResponse(nextInfoToCollect, updatedContext);
    } else {
      // If we have everything, generate the final success response.
      return this.generateCompletionResponse(updatedContext);
    }
  }

  private generateAccountChoiceResponse(context: ConversationContext): AgentResponse {
    const currentStep = REQUIRED_INFO.indexOf('accountId') + 1;
    const totalSteps = REQUIRED_INFO.length;

    return {
      status: 'AWAITING_INPUT',
      speech: "Great. Now, do you already have a Hedera account ID and private key, or would you like me to create a new one for you?",
      ui: {
        type: 'LAYOUT_STACK',
        props: {
          children: [
            {
              type: 'STEPPER',
              props: {
                currentStep: currentStep,
                totalSteps: totalSteps,
                title: "Account Setup"
              }
            },
            {
              type: 'TEXT',
              props: {
                title: "Hedera Account",
                text: "To interact with the network, you need a Hedera account. You can provide your existing credentials or create a new, free testnet account."
              }
            },
            {
              type: 'BUTTON_GROUP',
              props: {
                buttons: [
                  { text: "I have an account", payload: "provide_existing_account" },
                  { text: "Create a new account", payload: "create_new_account" },
                ]
              }
            }
          ]
        }
      },
      action: { type: 'REQUEST_USER_INPUT' },
      context: {
        ...context,
        collected_info: {
          ...context.collected_info,
          onboarding_step: 'account_id_choice',
        },
        status: 'awaiting_user_input',
        history: [...context.history, `OnboardingAgent is asking for account choice.`],
      },
    };
  }

  private delegateToCreateAccount(context: ConversationContext): AgentResponse {
    return {
      status: 'DELEGATING',
      speech: "Excellent! I'll create a new secure testnet account for you now. One moment.",
      ui: {
        type: 'LOADING',
        props: {
          text: "Generating new Hedera account..."
        }
      },
      action: {
        type: 'DELEGATE',
        payload: {
          agent: 'wallet/createAccountAgent',
          prompt: 'The user wants to create a new Hedera account during onboarding.'
        }
      },
      context: {
        ...context,
        status: 'delegating',
        history: [...context.history, 'OnboardingAgent is delegating to CreateAccountAgent.'],
      }
    };
  }

  private generateQuestionResponse(infoNeeded: string, context: ConversationContext): AgentResponse {
    const currentStep = REQUIRED_INFO.indexOf(infoNeeded) + 1;
    const totalSteps = REQUIRED_INFO.length;
    
    const emojiMap: Record<string, string> = {
      name: '🧑',
      accountId: '🆔',
      privateKey: '🔑',
      password: '🔢',
    };
    
    const placeholderMap: Record<string, string> = {
      name: 'Enter your name...',
      accountId: 'Enter your Hedera Account ID...',
      privateKey: 'Paste your private key...',
    };

    const speechMap: Record<string, string> = {
      name: "Let's get started! What's your name?",
      accountId: "What's your Hedera Account ID?",
      privateKey: "Please provide your private key. Don't worry, it will be encrypted locally on your device and never stored on a server.",
      password: "Finally, set a numeric password for signing transactions. Make it memorable!",
    };
    
    let uiComponent: any;

    if (infoNeeded === 'password') {
        uiComponent = {
            type: 'NUMERIC_KEYPAD_INPUT',
            props: {
                title: 'Set Your Password',
                emoji: emojiMap[infoNeeded],
            }
        };
    } else {
        uiComponent = {
            type: 'TEXT_INPUT',
            props: {
                title: infoNeeded === 'name' ? 'Your Name' : (infoNeeded === 'accountId' ? 'Account ID' : 'Private Key'),
                placeholder: placeholderMap[infoNeeded],
                buttonText: 'Submit',
                inputType: infoNeeded === 'privateKey' ? 'password' : 'text',
                emoji: emojiMap[infoNeeded],
            }
        };
    }

    return {
      status: 'AWAITING_INPUT',
      speech: speechMap[infoNeeded],
      ui: {
        type: 'LAYOUT_STACK',
        props: {
          children: [
            {
              type: 'STEPPER',
              props: { currentStep, totalSteps, title: 'Onboarding Progress' }
            },
            uiComponent
          ]
        }
      },
      action: { type: 'REQUEST_USER_INPUT' },
      context: {
        ...context,
        collected_info: {
          ...context.collected_info,
          onboarding_step: infoNeeded,
        },
        status: 'awaiting_user_input',
        history: [...context.history, `OnboardingAgent is requesting '${infoNeeded}'.`],
      },
    };
  }

  private generateCompletionResponse(context: ConversationContext): AgentResponse {
    const { name, accountId, privateKey, password } = context.collected_info;
    
    return {
      status: 'COMPLETE',
      speech: `All set, ${name}! I've securely encrypted and saved your credentials on this device. You're ready to command the network.`,
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
        payload: { name, accountId, privateKey, password },
      },
      context: {
        ...context,
        collected_info: { 
          ...context.collected_info,
        },
        status: 'complete',
        goal: 'onboarding_complete',
        history: [...context.history, 'OnboardingAgent completed successfully.'],
      },
    };
  }
}