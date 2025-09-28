export interface AgentManifest {
  description: string;
  // We can add more metadata here in the future, like example prompts.
}

export const AGENT_REGISTRY: Record<string, AgentManifest> = {
  // === The New Master Orchestrator ===
  "general/generalAgent": {
    description: "The primary conversational agent and master orchestrator. It handles complex queries, maintains conversation, decomposes tasks, and synthesizes responses from specialist agents. It is the 'personality' of the AI."
  },

  // === Specialist Agents (The Tools) ===
  "wallet/balanceAgent": {
    description: "A specialist tool that, when called with a Hedera account ID, fetches and returns the HBAR and token balances. It performs a single, focused task."
  },

  "wallet/historyAgent": {
    description: "A specialist tool that, when called with a Hedera account ID, retrieves a list of recent transactions from the Mirror Node. It performs a single, focused task."
  },

  "wallet/sendAgent": {
    description: "A specialist tool that manages the multi-turn process of sending HBAR to a recipient. It collects recipient and amount information and executes the transfer."
  },

  "research/newsAgent": {
    description: "A specialist tool that can search the web for up-to-date information, articles, and market data related to a specific query (e.g., 'Hedera NFTs')."
  },
  
  "utility/onboardingAgent": {
    description: "A specialist tool that manages the multi-step user onboarding conversation to collect name, account ID, and private key."
  },

  "utility/unknownAgent": {
    description: "A fallback tool that handles cases where the user's intent is unclear or cannot be mapped to any other specialist tool. It's responsible for asking clarifying questions."
  }
};