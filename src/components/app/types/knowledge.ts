export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  lastUpdated: string;
  linkedAgents: number;
  type: string;
  icon: React.ReactNode;
} 