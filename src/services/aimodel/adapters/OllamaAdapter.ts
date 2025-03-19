import { ModelProviderAdapter } from './interfaces';
import { AiModel } from '../../../models/chat';

export class OllamaAdapter implements ModelProviderAdapter {
  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.apiUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection test failed', error);
      return false;
    }
  }
  
  async fetchModels(config: any): Promise<Omit<AiModel, 'id' | 'createdAt' | 'updatedAt'>[]> {
    try {
      const response = await fetch(`${config.apiUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.models.map((model: any) => ({
        name: model.name,
        providerId: config.providerId,
        modelId: model.name,
        groupId: 'local',
        capabilities: ['chat', 'completion'],
        contextWindow: 4096,
        maxTokens: 2048,
        config: {}
      }));
    } catch (error) {
      console.error('Failed to fetch Ollama models', error);
      throw error;
    }
  }
}
