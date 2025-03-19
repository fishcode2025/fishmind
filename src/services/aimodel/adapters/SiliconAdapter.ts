import { ModelProviderAdapter } from './interfaces';
import { AiModel } from '../../../models/chat';

export class SiliconAdapter implements ModelProviderAdapter {
  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.apiUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Silicon connection test failed', error);
      return false;
    }
  }
  
  async fetchModels(config: any): Promise<Omit<AiModel, 'id' | 'createdAt' | 'updatedAt'>[]> {
    try {
      const response = await fetch(`${config.apiUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.data.map((model: any) => {
        const modelId = model.id;
        const groupId = this.extractGroupId(modelId);
        const capabilities = this.determineCapabilities(modelId);
        
        return {
          name: model.name || modelId,
          providerId: config.providerId,
          modelId: modelId,
          groupId: groupId,
          capabilities: capabilities,
          contextWindow: model.context_window || 8192,
          maxTokens: model.max_tokens || 4096,
          config: {
            ...model,
            type: model.type || 'chat',
            created: model.created,
            owned_by: model.owned_by,
            permission: model.permission,
          }
        };
      });
    } catch (error) {
      console.error('Failed to fetch Silicon models', error);
      throw error;
    }
  }
  
  private extractGroupId(modelId: string): string {
    if (modelId.includes('chat')) return 'chat';
    if (modelId.includes('embedding')) return 'embedding';
    return 'other';
  }
  
  private determineCapabilities(modelId: string): string[] {
    const capabilities: string[] = [];
    
    if (modelId.includes('chat')) {
      capabilities.push('chat');
    }
    
    if (modelId.includes('embedding')) {
      capabilities.push('embedding');
    }
    
    return capabilities.length > 0 ? capabilities : ['chat'];
  }
}
