import { IAgent, ConversationContext, AgentResponse } from '../agentUtils';
import getNftInfo from '../../../pages/api/getNftInfo';

export class NftInfoAgent implements IAgent {
    private collectionId: string | null = null;
    private serialNumber: string | null = null;

    async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
        // Check for collection ID first
        if (!this.collectionId) {
            const possibleCollectionId = this.extractCollectionId(prompt);
            if (possibleCollectionId) {
                this.collectionId = possibleCollectionId;
            } else {
                return {
                    status: 'AWAITING_INPUT',
                    speech: "Please provide the NFT collection ID you'd like to get information about.",
                    ui: {
                        type: 'text-input',
                        placeholder: 'Enter collection ID (e.g., 0.0.12345)'
                    },
                    action: { type: 'REQUEST_USER_INPUT' },
                    context: {
                        ...context,
                        status: 'awaiting_user_input'
                    }
                };
            }
        }

        // Check for serial number if collection ID is provided
        if (!this.serialNumber) {
            const possibleSerial = this.extractSerialNumber(prompt);
            if (possibleSerial) {
                this.serialNumber = possibleSerial;
            } else {
                return {
                    status: 'AWAITING_INPUT',
                    speech: "Please provide the serial number of the NFT you'd like to get information about.",
                    ui: {
                        type: 'text-input',
                        placeholder: 'Enter NFT serial number (e.g., 1)'
                    },
                    action: { type: 'REQUEST_USER_INPUT' },
                    context: {
                        ...context,
                        status: 'awaiting_user_input',
                        collected_info: {
                            ...context.collected_info,
                            collectionId: this.collectionId
                        }
                    }
                };
            }
        }

        try {
            // Get NFT information
            const response = await fetch(`/api/getNftInfo?collectionId=${this.collectionId}&serialNumber=${this.serialNumber}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch NFT info: ${response.statusText}`);
            }
            
            const nftInfo = await response.json();

            // Format the response
            const infoMessage = `Here's the information for NFT ${this.collectionId} (Serial #${this.serialNumber}):\n\n` +
                `Token ID: ${nftInfo.token_id}\n` +
                `Serial Number: ${nftInfo.serial_number}\n` +
                `Current Owner: ${nftInfo.account_id}\n` +
                `Created: ${new Date(nftInfo.created_timestamp).toLocaleString()}\n` +
                `Metadata: ${nftInfo.metadata}`;

            return {
                status: 'COMPLETE',
                speech: infoMessage,
                ui: {
                    type: 'nft-info-card',
                    data: nftInfo
                },
                action: { type: 'COMPLETE_GOAL' },
                context: {
                    ...context,
                    status: 'complete',
                    collected_info: {
                        ...context.collected_info,
                        nftInfo
                    }
                }
            };
        } catch (error: any) {
            return {
                status: 'ERROR',
                speech: `Error retrieving NFT information: ${error.message}`,
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

    private extractCollectionId(message: string): string | null {
        // Look for common collection ID patterns (e.g., 0.0.12345)
        const collectionIdPattern = /\b0\.0\.\d+\b/;
        const match = message.match(collectionIdPattern);
        return match ? match[0] : null;
    }

    private extractSerialNumber(message: string): string | null {
        // Look for serial number patterns (simple numbers)
        const serialPattern = /\b\d+\b/;
        const match = message.match(serialPattern);
        return match ? match[0] : null;
    }

    reset(): void {
        this.collectionId = null;
        this.serialNumber = null;
    }
}
