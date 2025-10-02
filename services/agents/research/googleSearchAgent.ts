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

export default class GoogleSearchAgent implements IAgent {
    private isSearching: boolean = false;

    // ...existing code...
    async execute(prompt: string, context: ConversationContext): Promise<AgentResponse> {
        const isServer = typeof window === 'undefined';
        const axios = isServer ? require('axios') : null;
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
            let result: ResearchResponse;
            if (isServer) {
                // SSR/Node.js: Use axios
                const response = await axios.default.post(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/research`,
                    { query: prompt },
                    { headers: { 'Content-Type': 'application/json' } }
                );
                result = response.data;
            } else {
                // Client: Use fetch
                const response = await fetch('/api/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: prompt })
                });
                if (!response.ok) {
                    throw new Error(`Research failed: ${response.statusText}`);
                }
                result = await response.json();
            }

            if (result.error) {
                throw new Error(result.error);
            }

            // Format sources for AgentDisplay LIST
            const sourcesList = result.sources.map((source) => ({
                title: source.title,
                description: source.snippet,
                url: source.url
            }));

            // Placeholder for stats and charts (could be generated from result.summary or sources)
            const stats: { label: string; value: number }[] = [
                { label: 'Total Sources', value: result.sources.length },
                // Add more stats as needed
            ];
            const chartData: { label: string; value: number }[] = [
                // Example chart data
                // { label: 'Project A', value: 42 },
                // { label: 'Project B', value: 27 },
            ];

            return {
                status: 'COMPLETE',
                speech: result.summary,
                ui: {
                    type: 'LAYOUT_STACK',
                    props: {
                        children: [
                            {
                                type: 'TEXT',
                                props: {
                                    title: 'Research Summary',
                                    text: result.summary
                                }
                            },
                            {
                                type: 'LIST',
                                props: {
                                    title: 'Sources',
                                    items: sourcesList
                                }
                            },
                            {
                                type: 'STAT',
                                props: {
                                    title: 'Stats',
                                    items: stats
                                }
                            },
                            {
                                type: 'CHART',
                                props: {
                                    title: 'Community Activity',
                                    data: chartData
                                }
                            }
                        ]
                    }
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
            let message = error?.message || 'Unknown error';
            if (error?.response?.data?.error) {
                message += `: ${error.response.data.error}`;
            }
            return {
                status: 'ERROR',
                speech: `Error performing research: ${message}`,
                ui: {
                    type: 'error-message',
                    message
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
