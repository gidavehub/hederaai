// /services/agents/utility/securityAgent.ts
import { IAgent, AgentResponse } from '../agentUtils';
import { ConversationContext } from '../router';

/**
 * SecurityAgent: Handles transaction signing by requesting the user's password.
 * Should be called by any agent performing sensitive actions (payments, transfers, etc).
 */
export default class SecurityAgent implements IAgent {
  async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
    // If password is not present, ask for it
    if (!context.collected_info.password) {
      return {
        status: 'AWAITING_INPUT',
        speech: 'Please enter your password to authorize this transaction.',
        ui: {
          type: 'LAYOUT_STACK',
          props: {
            children: [
              {
                type: 'TEXT_INPUT',
                props: {
                  title: 'Transaction Authorization',
                  placeholder: 'Enter your password',
                  buttonText: 'Authorize',
                  inputType: 'password'
                }
              }
            ]
          }
        },
        action: { type: 'REQUEST_USER_INPUT' },
        context: {
          ...context,
          status: 'awaiting_user_input',
          collected_info: {
            ...context.collected_info,
            security_step: 'password'
          }
        }
      };
    }
    // If password is present, proceed with transaction signing
    return {
      status: 'COMPLETE',
      speech: 'Password received. Signing transaction...',
      ui: {
        type: 'LOADING',
        props: { text: 'Signing transaction...' }
      },
      action: { type: 'COMPLETE_GOAL' },
      context: {
        ...context,
        status: 'complete',
        security_step: 'signed'
      }
    };
  }
}
