import { Model, ModelProviderAdapter, extractGroupId } from '../models/types';

/**
 * Ollama 模型服务适配器
 */
export class OllamaAdapter implements ModelProviderAdapter {
  /**
   * 测试与 Ollama API 的连接
   * @param config 配置信息，主要包含 apiUrl
   * @returns 连接是否成功
   */
  async testConnection(config: any): Promise<boolean> {
    try {
      // 调用Ollama的API来测试连接
      const response = await fetch(`${config.apiUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection test failed', error);
      return false;
    }
  }
  
  /**
   * 获取 Ollama 可用的模型列表
   * @param config 配置信息，主要包含 apiUrl
   * @returns 模型列表
   */
  async fetchModels(config: any): Promise<Model[]> {
    try {
      const response = await fetch(`${config.apiUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 转换Ollama的模型格式为我们的Model格式
      return data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        provider: 'ollama',
        group_id: extractGroupId(model.name), // 提取分组标识
        capabilities: ['chat'], // Ollama主要支持聊天功能
        config: {
          size: model.size,
          modified: model.modified
        }
      }));
    } catch (error) {
      console.error('Failed to fetch Ollama models', error);
      throw error;
    }
  }
}
