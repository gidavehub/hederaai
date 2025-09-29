// /services/agents/registry.ts

/**
 * Defines the structure for an agent's manifest entry.
 * This provides metadata for the GeneralAgent to understand what each specialist can do.
 */
export interface AgentManifest {
  description: string;
  // We can add more metadata here in the future, like example prompts or required context fields.
}

/**
 * The AGENT_REGISTRY is the central directory for all specialist agents in the system.
 * The GeneralAgent uses the 'description' of each agent to decide which tool to delegate tasks to.
 */
export const AGENT_REGISTRY: Record<string, AgentManifest> = {
  // === The Master Orchestrator ===
  "general/generalAgent": {
    description: "The primary conversational agent and master orchestrator. It handles complex queries, maintains conversation, decomposes tasks, and synthesizes responses from specialist agents. It is the 'personality' of the AI."
  },

  // === Wallet Specialist Agents (Tools) ===
  "wallet/balanceAgent": {
    description: "A specialist tool that, when called with a Hedera account ID, fetches and returns the HBAR and token balances. It performs a single, focused task."
  },
  "wallet/createAccountAgent": {
    description: "A specialist tool that creates a new Hedera account, collects initial balance, and returns the account ID and keys. Prompts the user for initial balance if not provided."
  },

  "wallet/historyAgent": {
    description: "A specialist tool that, when called with a Hedera account ID, retrieves a list of recent transactions from the Mirror Node. It performs a single, focused task."
  },

  "wallet/sendAgent": {
    description: "A specialist tool that manages the multi-turn process of sending HBAR to a recipient. It collects recipient and amount information and executes the transfer."
  },

  // === Utility Specialist Agents (Tools) ===
  "utility/memoryAgent": {
    description: "A specialist tool for managing the user's long-term memory. Use it when the user explicitly asks to 'remember', 'remind', 'forget', or 'update' a piece of information."
  },

  "utility/onboardingAgent": {
    description: "A specialist tool that manages the multi-step user onboarding conversation to collect name, account ID, and private key."
  },

  // === Research Specialist Agents ===
  "research/googleSearchAgent": {
    description: "An advanced research tool that performs comprehensive analysis of Hedera-related topics by searching multiple sources, extracting relevant content, and synthesizing information using AI. It provides detailed summaries with citations and source verification."
  },

  // === Token Management Agents ===
  "token/createFungibleAgent": {
    description: "A specialist tool that handles the creation of new fungible tokens on the Hedera network. It collects token name, symbol, and initial supply information in a multi-step process."
  },

  "token/associateAgent": {
    description: "A specialist tool that manages the process of associating tokens with a Hedera account. It ensures the account can receive specific tokens by creating the necessary association."
  },

  // === HBAR Transaction Agents ===
  "wallet/sendHbarAgent": {
    description: "A specialist tool that manages the multi-turn process of sending HBAR to recipients. It collects recipient account ID and amount information, then executes the transfer securely."
  },

  // === NFT Management Agents ===
  "nft/createCollectionAgent": {
    description: "A specialist tool that handles the creation of new NFT collections on the Hedera network. It collects collection name and symbol in a multi-step process."
  },

  "nft/sendNftAgent": {
    description: "A specialist tool that manages the process of sending NFTs to other accounts. It collects collection ID, serial number, and recipient information in a multi-step process."
  },

  // === Hedera Consensus Service (HCS) Agents ===
  "hcs/createTopicAgent": {
    description: "A specialist tool that handles the creation of new HCS topics on the Hedera network. It optionally collects a memo to describe the topic's purpose."
  },

  "hcs/submitMessageAgent": {
    description: "A specialist tool that manages the process of submitting messages to HCS topics. It collects the topic ID and message content."
  },

  "hcs/getMessagesAgent": {
    description: "A specialist tool that retrieves and formats messages from a specified HCS topic. It presents messages in a chronological list format."
  },

  // === Token Info Agents ===
  "token/infoAgent": {
    description: "A specialist tool that retrieves detailed information about fungible tokens on the Hedera network, including name, symbol, supply, and other properties."
  },

  // === NFT Operations ===
  "nft/infoAgent": {
    description: "A specialist tool that retrieves detailed information about specific NFTs, including their collection details, current owner, metadata, and creation timestamp."
  },

  "nft/mintAgent": {
    description: "A specialist tool that handles minting new NFTs into existing collections. It collects collection ID, supply key, and metadata in a multi-step process."
  },

  // === Token Operations ===
  "token/sendFungibleAgent": {
    description: "A specialist tool that manages the process of sending fungible tokens to other accounts. It collects token ID, amount, and recipient information."
  },
};