// /lib/types.ts

// A single, primitive UI component
export type UIComponentData = {
  type: "TEXT" | "INPUT" | "BUTTON" | "LIST" | "CARD" | "CHART" | "TEXT_RESPONSE";
  props: { [key: string]: any }; 
};

// A layout container
export type UILayoutData = {
  type: "LAYOUT_STACK" | "LAYOUT_GRID";
  props: {
    children: (UIComponentData | UILayoutData)[];
  };
};

// --- NEW: The full UARP response type ---
export type AgentUARP = {
  id: string;
  speech?: string;
  ui?: UIComponentData | UILayoutData;
  action?: { [key: string]: any };
  context: any;
};