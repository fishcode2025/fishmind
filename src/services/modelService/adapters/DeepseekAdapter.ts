import { Model, ModelProviderAdapter } from '../models/types';

/**
 * Deepseek API 适配器
 */
export class DeepseekAdapter implements ModelProviderAdapter {
  /**
   * 测试连接
   * @param config 配置信息，包含 apiKey 和 apiUrl
   * @returns 连接是否成功
   */
  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.apiUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to test Deepseek connection', error);
      return false;
    }
  }
  
  /**
   * 获取 Deepseek 可用的模型列表
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
      
      // 转换 Deepseek 的模型格式为我们的 Model 格式
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: 'deepseek',
        group_id: this.extractGroupId(model.id),
        capabilities: this.determineCapabilities(model.id),
        config: {}
      }));
    } catch (error) {
      console.error('Failed to fetch Deepseek models', error);
      throw error;
    }
  }
  
  /**
   * 从模型 ID 中提取分组标识
   * @param modelId 模型 ID
   * @returns 分组标识
   */
  private extractGroupId(modelId: string): string {
    // 根据模型 ID 提取分组标识
    if (modelId.includes('chat')) {
      return 'chat';
    }
    if (modelId.includes('code')) {
      return 'code';
    }
    return 'general';
  }
  
  /**
   * 根据模型 ID 确定其能力
   * @param modelId 模型 ID
   * @returns 能力列表
   */
  private determineCapabilities(modelId: string): string[] {
    const capabilities: string[] = [];
    
    if (modelId.includes('chat')) {
      capabilities.push('chat');
    }
    
    if (modelId.includes('embedding')) {
      capabilities.push('embedding');
    }
    
    return capabilities.length > 0 ? capabilities : ['chat']; // 默认至少有 chat 能力
  }
} 