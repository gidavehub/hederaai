// /services/agents/wallet/createAccountAgent.ts

import { IAgent, AgentResponse } from '../agentUtils';
import { ConversationContext } from '../router';

// This is the expected shape of the API response
type CreateAccountResult = {
	accountId: string;
	publicKey: string;
	privateKey: string;
	message: string;
};

export default class CreateAccountAgent implements IAgent {
	public async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
		console.log('[CreateAccountAgent] Executing...');

		// STATE 2: User has seen the keys and clicked "Continue"
		if (prompt === 'creation_confirmed') {
			console.log('[CreateAccountAgent] User confirmed key storage. Completing task.');
			// This response signals to the Router that this sub-task is complete.
			// The Router will then pass its context back to the parent (OnboardingAgent).
			return {
				status: 'COMPLETE',
				speech: 'Great, let\'s continue the setup process.',
				ui: { type: 'LOADING', props: { text: "Finalizing account setup..." } },
				action: { type: 'COMPLETE_GOAL' },
				context: {
					...context,
					status: 'complete',
					history: [...context.history, 'CreateAccountAgent completed successfully.'],
				},
			};
		}

		// STATE 1: Initial call. Create the account.
		try {
			console.log('[CreateAccountAgent] Calling API to create a new testnet account.');
			
            // For onboarding, we use a default initial balance for the free testnet account.
			const initialBalance = 10; 

			// This logic simulates calling a backend API route to create the account.
			const isServer = typeof window === 'undefined';
			let result: CreateAccountResult;
			if (isServer) {
				const axios = require('axios');
				const response = await axios.default.post(
					`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/createAccount`,
					{ initialBalance },
					{ headers: { 'Content-Type': 'application/json' } }
				);
				result = response.data;
			} else {
				const response = await fetch('/api/createAccount', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ initialBalance }),
				});
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to create account.');
				}
				result = await response.json();
			}

			console.log(`[CreateAccountAgent] Account ${result.accountId} created successfully.`);

            // Prepare the response to show the user their new credentials and wait for confirmation.
			return {
				status: 'AWAITING_INPUT',
				speech: `Success! I've created a new Hedera testnet account for you. Please copy and save your Private Key in a secure password manager. This key cannot be recovered if you lose it.`,
				ui: {
					type: 'LAYOUT_STACK',
					props: {
						children: [
							{
								type: 'KEY_VALUE_DISPLAY',
								props: {
                                    title: 'Your New Hedera Account',
									items: [
                                        { key: "Account ID", value: result.accountId },
                                        { key: "Public Key", value: result.publicKey },
                                        { key: "Private Key", value: result.privateKey },
                                    ]
								}
							},
                            {
                                type: 'TEXT',
                                props: {
                                    title: "⚠️ Important Security Notice",
                                    text: "This is your only chance to save your Private Key. Treat it like a password to your bank account."
                                }
                            },
							{
								type: 'BUTTON',
								props: {
									text: "I have securely saved my keys. Continue Onboarding.",
									payload: 'creation_confirmed',
								}
							}
						]
					}
				},
				action: { type: 'REQUEST_USER_INPUT' },
				context: {
					...context,
                    // Store the results in the context so we have them for the final step.
					collected_info: {
						...context.collected_info,
						lastCreatedAccountId: result.accountId,
						lastCreatedAccountPrivateKey: result.privateKey,
						lastCreatedAccountPublicKey: result.publicKey,
					},
					status: 'awaiting_user_input',
					history: [...context.history, `CreateAccountAgent created ${result.accountId} and is awaiting confirmation.`],
				},
			};

		} catch (error: any) {
			console.error('[CreateAccountAgent] Error:', error);
			// If creation fails, return a COMPLETE status so the parent agent can see the error.
			return {
				status: 'COMPLETE',
				speech: 'I ran into a problem while creating your account. Please try again in a moment.',
				ui: {
					type: 'TEXT',
					props: {
						title: 'Account Creation Failed',
						text: `Details: ${error.message}`,
					},
				},
				action: { type: 'COMPLETE_GOAL' },
				context: {
					...context,
					status: 'failed',
					history: [...context.history, `CreateAccountAgent failed: ${error.message}`],
				},
			};
		}
	}
}