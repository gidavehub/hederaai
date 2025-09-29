import { IAgent, ConversationContext, AgentResponse } from '../agentUtils';

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

interface ResearchResponse {
    summary: string;
    sources: SearchResult[];
    error?: string;
}

export class GoogleSearchAgent implements IAgent {
    private isSearching: boolean = false;

    async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
        if (!prompt) {
            return {
                status: 'AWAITING_INPUT',
                speech: "What would you like me to research about Hedera?",
                ui: {
                    type: 'text-input',
                    placeholder: 'Enter your research question'
                },
                action: { type: 'REQUEST_USER_INPUT' },
                context: {
                    ...context,
                    status: 'awaiting_user_input'
                }
            };
        }

        if (!this.isSearching) {
            this.isSearching = true;
            return {
                status: 'DELEGATING',
                speech: `Researching "${prompt}" across multiple sources. This may take a moment...`,
                ui: {
                    type: 'loading',
                    message: 'Analyzing sources...'
                },
                action: { type: 'REQUEST_USER_INPUT' },
                context: {
                    ...context,
                    status: 'pending',
                    collected_info: {
                        ...context.collected_info,
                        searchQuery: prompt
                    }
                }
            };
        }

        try {
            const response = await fetch('/api/research', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: prompt })
            });

            if (!response.ok) {
                throw new Error(`Research failed: ${response.statusText}`);
            }

            const result: ResearchResponse = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            // Format sources for display
            const sourcesList = result.sources
                .map((source, index) => `${index + 1}. [${source.title}](${source.url})\n   ${source.snippet}`)
                .join('\n\n');

            return {
                status: 'COMPLETE',
                speech: result.summary,
                ui: {
                    type: 'research-results',
                    components: [
                        {
                            type: 'markdown',
                            content: `## Research Summary\n\n${result.summary}\n\n## Sources\n\n${sourcesList}`
                        },
                        {
                            type: 'button-group',
                            buttons: result.sources.map(source => ({
                                label: `Visit ${source.title}`,
                                url: source.url
                            }))
                        }
                    ]
                },
                action: { type: 'COMPLETE_GOAL' },
                context: {
                    ...context,
                    status: 'complete',
                    collected_info: {
                        ...context.collected_info,
                        researchSummary: result.summary,
                        sources: result.sources
                    }
                }
            };
        } catch (error: any) {
            return {
                status: 'ERROR',
                speech: `Error performing research: ${error.message}`,
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
        } finally {
            this.isSearching = false;
        }
    }

    reset(): void {
        this.isSearching = false;
    }
}
