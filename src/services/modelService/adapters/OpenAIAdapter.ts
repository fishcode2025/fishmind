import { Model, ModelProviderAdapter, extractGroupId } from '../models/types';

/**
 * OpenAI 模型服务适配器
 */
export class OpenAIAdapter implements ModelProviderAdapter {
  /**
   * 测试与 OpenAI API 的连接
   * @param config 配置信息，包含 apiKey 和 apiUrl
   * @returns 连接是否成功
   */
  async testConnection(config: any): Promise<boolean> {
    try {
      // 简单调用模型列表API来测试连接
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
  
  /**
   * 获取 OpenAI 可用的模型列表
   * @param config 配置信息，包含 apiKey 和 apiUrl
   * @returns 模型列表
   */
  async fetchModels(config: any): Promise<Model[]> {
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
      
      // 转换OpenAI的模型格式为我们的Model格式
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: 'openai',
        group_id: extractGroupId(model.id), // 提取分组标识
        capabilities: this.determineCapabilities(model.id),
        config: {}
      }));
    } catch (error) {
      console.error('Failed to fetch OpenAI models', error);
      throw error;
    }
  }
  
  /**
   * 根据模型ID确定其能力
   * @param modelId 模型ID
   * @returns 能力列表
   */
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
    
    return capabilities.length > 0 ? capabilities : ['chat']; // 默认至少有chat能力
  }
}
