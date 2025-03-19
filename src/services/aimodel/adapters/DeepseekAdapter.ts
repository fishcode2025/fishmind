import { ModelProviderAdapter } from './interfaces';
import { AiModel } from '../../../models/chat';

export class DeepseekAdapter implements ModelProviderAdapter {
  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.apiUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Deepseek connection test failed', error);
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
      
      return data.data.map((model: any) => ({
        name: model.id,
        providerId: config.providerId,
        modelId: model.id,
        groupId: this.extractGroupId(model.id),
        capabilities: this.determineCapabilities(model.id),
        contextWindow: 16000,
        maxTokens: 8000,
        config: {}
      }));
    } catch (error) {
      console.error('Failed to fetch Deepseek models', error);
      throw error;
    }
  }
  
  private extractGroupId(modelId: string): string {
    if (modelId.includes('deepseek-chat')) return 'chat';
    if (modelId.includes('deepseek-coder')) return 'code';
    return 'other';
  }
  
  private determineCapabilities(modelId: string): string[] {
    const capabilities: string[] = [];
    
    if (modelId.includes('chat')) {
      capabilities.push('chat');
    }
    
    if (modelId.includes('coder')) {
      capabilities.push('code');
    }
    
    return capabilities.length > 0 ? capabilities : ['chat'];
  }
}
