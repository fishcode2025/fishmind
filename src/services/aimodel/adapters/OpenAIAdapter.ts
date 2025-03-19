import { ModelProviderAdapter } from './interfaces';
import { AiModel } from '../../../models/chat';

export class OpenAIAdapter implements ModelProviderAdapter {
  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.apiUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('OpenAI connection test failed', error);
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
        contextWindow: this.determineContextWindow(model.id),
        maxTokens: this.determineMaxTokens(model.id),
        config: {}
      }));
    } catch (error) {
      console.error('Failed to fetch OpenAI models', error);
      throw error;
    }
  }
  
  private extractGroupId(modelId: string): string {
    if (modelId.includes('gpt')) return 'gpt';
    if (modelId.includes('embedding')) return 'embedding';
    if (modelId.includes('dall-e')) return 'image';
    return 'other';
  }
  
  private determineCapabilities(modelId: string): string[] {
    const capabilities: string[] = [];
    
    if (modelId.includes('gpt')) {
      capabilities.push('chat');
    }
    
    if (modelId.includes('text-embedding')) {
      capabilities.push('embedding');
    }
    
    if (modelId.includes('dall-e')) {
      capabilities.push('image');
    }
    
    return capabilities.length > 0 ? capabilities : ['chat'];
  }
  
  private determineContextWindow(modelId: string): number {
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo')) return 4096;
    return 2048;
  }
  
  private determineMaxTokens(modelId: string): number {
    if (modelId.includes('gpt-4')) return 4096;
    if (modelId.includes('gpt-3.5-turbo')) return 2048;
    return 1024;
  }
}
