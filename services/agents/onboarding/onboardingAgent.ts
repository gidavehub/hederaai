// /services/agents/onboarding/onboardingAgent.ts

import { AgentResponse, IAgent, extractJsonFromResponse } from '../agentUtils';
import { ConversationContext } from '../router';
import { geminiModel } from '../../geminiServices';

// This is the "shape" of the information this agent needs to collect.
// **MODIFICATION**: Added 'password' to the required info.
const REQUIRED_INFO = ["name", "password", "accountId", "privateKey"];

export default class OnboardingAgent implements IAgent {
  public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    console.log('[OnboardingAgent V3] Executing with branching logic...');
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
      if (prompt === 'provide_existing_account') {
        // User has an account. We'll proceed to ask for the accountId.
        // We clear the step so the main logic can find the next required info.
        updatedContext.collected_info.onboarding_step = null;
      }
    }
    
    // --- State Logic: Handle resuming after account creation ---
    // The Router/GeneralAgent will place specialist results here.
    const createAccountResult = context.collected_info.specialist_results?.[0];
    if (createAccountResult && createAccountResult.context?.goal === 'createAccount') {
        console.log('[OnboardingAgent V3] Resuming from CreateAccountAgent result.');
        const { lastCreatedAccountId, lastCreatedAccountPrivateKey } = createAccountResult.context.collected_info;
        if (lastCreatedAccountId && lastCreatedAccountPrivateKey) {
            updatedContext.collected_info.accountId = lastCreatedAccountId;
            updatedContext.collected_info.privateKey = lastCreatedAccountPrivateKey;
            // Clean up the specialist results so we don't process them again.
            delete updatedContext.collected_info.specialist_results;
        }
    }


    // --- Main Logic: Find the next piece of info to collect ---
    const nextInfoToCollect = REQUIRED_INFO.find(info => !updatedContext.collected_info[info]);

    if (nextInfoToCollect) {
      // **MODIFICATION**: Special branching logic for account ID.
      if (nextInfoToCollect === 'accountId') {
        return this.generateAccountChoiceResponse(updatedContext);
      }
      // For all other info, use the standard AI question generator.
      return this.generateAIQuestionResponse(nextInfoToCollect, updatedContext);
    } else {
      // If we have everything, generate the final success response.
      return this.generateCompletionResponse(updatedContext);
    }
  }

  /**
   * Generates a UI to ask the user if they have an account or need a new one.
   */
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
              type: 'TEXT', // Adding a text component for more context
              props: {
                title: "Hedera Account",
                text: "To interact with the network, you need a Hedera account. You can provide your existing credentials or create a new, free testnet account."
              }
            },
            {
              type: 'BUTTON_GROUP', // This is a new, conceptual UI component
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
          onboarding_step: 'account_id_choice', // Special step for the choice
        },
        status: 'awaiting_user_input',
        history: [...context.history, `OnboardingAgent is asking for account choice.`],
      },
    };
  }

  /**
   * Generates a DELEGATE response to trigger the CreateAccountAgent.
   */
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

  /**
   * Generates a UARP response by asking an LLM to design the UI for the next question.
   */
  private async generateAIQuestionResponse(infoNeeded: string, context: ConversationContext): Promise<AgentResponse> {
    const currentStep = REQUIRED_INFO.indexOf(infoNeeded) + 1;
    const totalSteps = REQUIRED_INFO.length;
    let ui, speech;
    // Unique emoji for each field
    const emojiMap: Record<string, string> = {
      name: '🧑',
      accountId: '🆔',
      privateKey: '🔑',
      password: '🔢',
    };
    // Unique placeholder for each field
    const placeholderMap: Record<string, string> = {
      name: 'Enter your name...',
      accountId: 'Enter your Hedera Account ID...',
      privateKey: 'Paste your private key...',
      password: 'Enter a numeric password...',
    };
    // Unique speech for each field
    const speechMap: Record<string, string> = {
      name: "Let's get started! What's your name?",
      accountId: "What's your Hedera Account ID?",
      privateKey: "Please provide your private key. Don't worry, it's encrypted!",
      password: "Set a numeric password (numbers only) for signing transactions. Make it memorable!",
    };
    // UI for each field
    if (infoNeeded === 'password') {
      ui = {
        type: 'LAYOUT_STACK',
        props: {
          children: [
            {
              type: 'STEPPER',
              props: { currentStep, totalSteps, title: 'Onboarding Progress' }
            },
            {
              type: 'NUMERIC_KEYPAD_INPUT',
              props: {
                title: 'Set Your Password',
                buttonText: 'Save Password',
                emoji: emojiMap[infoNeeded],
                onSubmit: undefined // handled by AgentDisplay
              }
            }
          ]
        }
      };
      speech = speechMap[infoNeeded];
    } else {
      ui = {
        type: 'LAYOUT_STACK',
        props: {
          children: [
            {
              type: 'STEPPER',
              props: { currentStep, totalSteps, title: 'Onboarding Progress' }
            },
            {
              type: 'TEXT_INPUT',
              props: {
                title: infoNeeded === 'name' ? 'Your Name' : (infoNeeded === 'accountId' ? 'Account ID' : 'Private Key'),
                placeholder: placeholderMap[infoNeeded],
                buttonText: 'Submit',
                inputType: infoNeeded === 'privateKey' ? 'password' : 'text',
                emoji: emojiMap[infoNeeded],
                onSubmit: undefined // handled by AgentDisplay
              }
            }
          ]
        }
      };
      speech = speechMap[infoNeeded];
    }
    return {
      status: 'AWAITING_INPUT',
      speech,
      ui,
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

  /**
   * Generates the final UARP response when onboarding is complete.
   */
  private generateCompletionResponse(context: ConversationContext): AgentResponse {
    // **MODIFICATION**: Destructure the new password field and include it in the payload.
    const { name, accountId, privateKey, password } = context.collected_info;
    
    return {
      status: 'COMPLETE',
      speech: `All set, ${name}! I've securely encrypted and saved your credentials. You can now use the Nexus Bar to command the network.`,
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
        payload: { name, accountId, privateKey, password }, // Password is now included
      },
      context: {
        ...context,
        collected_info: { // Persist credentials in context for the session
          ...context.collected_info,
        },
        status: 'complete',
        goal: 'onboarding_complete',
        history: [...context.history, 'OnboardingAgent completed successfully.'],
      },
    };
  }
}