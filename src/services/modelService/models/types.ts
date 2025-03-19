/**
 * 模型服务提供商接口
 */
export interface ModelServiceProvider {
  id: string;           // 唯一标识符，如 'openai', 'ollama'
  name: string;         // 显示名称，如 'OpenAI', 'Ollama'
  enabled: boolean;     // 是否启用
  icon?: string;        // 图标路径或组件
  apiKey?: string;      // API密钥（对于需要密钥的服务）
  apiUrl: string;       // API基础URL
  models: Model[];      // 该服务支持的模型列表
  // 服务特定的其他配置项
  config?: Record<string, any>;
}

/**
 * 模型接口
 */
export interface Model {
  id: string;           // 模型ID
  name: string;         // 模型名称
  provider: string;     // 所属提供商ID
  group_id: string;     // 模型分组标识
  capabilities: string[]; // 模型能力，如 'chat', 'completion', 'embedding'
  // 模型特定的配置参数
  config?: Record<string, any>;
}

/**
 * 模型提供商适配器接口
 */
export interface ModelProviderAdapter {
  // 测试连接
  testConnection(config: any): Promise<boolean>;
  
  // 获取模型列表
  fetchModels(config: any): Promise<Model[]>;
}

/**
 * 从模型ID中提取分组标识
 * 如果ID中包含斜杠，则取最后一个斜杠前面的所有内容
 * 如果ID中没有斜杠，则返回"default"
 */
export function extractGroupId(modelId: string): string {
  const lastSlashIndex = modelId.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return 'default';
  }
  return modelId.substring(0, lastSlashIndex);
}
