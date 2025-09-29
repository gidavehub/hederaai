import { IAgent, ConversationContext, AgentResponse } from '../agentUtils';
import getTokenInfo from '../../../pages/api/getTokenInfo';

export class TokenInfoAgent implements IAgent {
    private tokenId: string | null = null;

    async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
        // First message - Ask for token ID if not provided
        if (!this.tokenId) {
            const possibleTokenId = this.extractTokenId(prompt);
            if (possibleTokenId) {
                this.tokenId = possibleTokenId;
            } else {
                return {
                    status: 'AWAITING_INPUT',
                    speech: "Please provide the token ID you'd like to get information about.",
                    ui: {
                        type: 'text-input',
                        placeholder: 'Enter token ID (e.g., 0.0.12345)'
                    },
                    action: { type: 'REQUEST_USER_INPUT' },
                    context: {
                        ...context,
                        status: 'awaiting_user_input'
                    }
                };
            }
        }

        try {
            // Get token information
            const tokenInfo = await getTokenInfo({ tokenId: this.tokenId });

            // Format the response
            const infoMessage = `Here's the information for token ${this.tokenId}:\n\n` +
                `Name: ${tokenInfo.name}\n` +
                `Symbol: ${tokenInfo.symbol}\n` +
                `Total Supply: ${tokenInfo.totalSupply}\n` +
                `Decimals: ${tokenInfo.decimals}\n` +
                `Treasury Account: ${tokenInfo.treasury}\n` +
                `Type: ${tokenInfo.type}`;

            return {
                status: 'COMPLETE',
                speech: infoMessage,
                ui: {
                    type: 'token-info-card',
                    data: tokenInfo
                },
                action: { type: 'COMPLETE_GOAL' },
                context: {
                    ...context,
                    status: 'complete',
                    collected_info: {
                        ...context.collected_info,
                        tokenInfo
                    }
                }
            };
        } catch (error: any) {
            return {
                status: 'ERROR',
                speech: `Error retrieving token information: ${error.message}`,
                ui: {
                    type: 'error-message',
                    message: error.message
                },
                action: { type: 'COMPLETE_GOAL' },
                context: {
                    ...context,
                    status: 'failed'
                }
            };
        }
    }

    private extractTokenId(message: string): string | null {
        // Look for common token ID patterns (e.g., 0.0.12345)
        const tokenIdPattern = /\b0\.0\.\d+\b/;
        const match = message.match(tokenIdPattern);
        return match ? match[0] : null;
    }

    reset(): void {
        this.tokenId = null;
    }
}
