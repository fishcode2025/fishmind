import { AiModel } from "@/models/chat";

// src/services/aimodel/adapters/interfaces.ts
export interface ModelProviderAdapter {
    testConnection(config: any): Promise<boolean>;
    fetchModels(config: any): Promise<Omit<AiModel, 'id' | 'createdAt' | 'updatedAt'>[]>;
  }
  
