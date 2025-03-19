import { DefaultModelStorage, DefaultModelType, DefaultModelConfig } from './DefaultModelStorage';
import modelService, { Model, ModelServiceProvider } from '../modelService';

/**
 * 默认模型服务
 * 负责管理默认模型配置
 */
export class DefaultModelService {
  private storage: DefaultModelStorage;
  
  constructor() {
    this.storage = new DefaultModelStorage();
  }
  
  /**
   * 保存默认模型配置
   * @param type 模型类型
   * @param providerId 提供商ID
   * @param modelId 模型ID
   * @returns 保存后的配置
   */
  async saveDefaultModel(type: DefaultModelType, providerId: string, modelId: string): Promise<DefaultModelConfig> {
    // 获取模型信息
    const provider = await modelService.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    
    const model = provider.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }
    
    // 创建配置
    const config: DefaultModelConfig = {
      providerId,
      modelId,
      name: model.name
    };
    
    // 保存配置
    await this.storage.saveDefaultModel(type, config);
    
    return config;
  }
  
  /**
   * 加载默认模型配置
   * @param type 模型类型
   * @returns 模型配置，如果不存在则返回null
   */
  async loadDefaultModel(type: DefaultModelType): Promise<DefaultModelConfig | null> {
    return this.storage.loadDefaultModel(type);
  }
  
  /**
   * 获取默认模型
   * @param type 模型类型
   * @returns 模型和提供商信息，如果不存在则返回null
   */
  async getDefaultModel(type: DefaultModelType): Promise<{ provider: ModelServiceProvider, model: Model } | null> {
    const config = await this.loadDefaultModel(type);
    if (!config) {
      return null;
    }
    
    const provider = await modelService.getProvider(config.providerId);
    if (!provider) {
      return null;
    }
    
    const model = provider.models.find(m => m.id === config.modelId);
    if (!model) {
      return null;
    }
    
    return { provider, model };
  }
  
  /**
   * 获取默认助手模型
   * @returns 模型和提供商信息，如果不存在则返回null
   */
  async getDefaultAssistantModel(): Promise<{ provider: ModelServiceProvider, model: Model } | null> {
    return this.getDefaultModel('assistant');
  }
  
  /**
   * 获取默认话题命名模型
   * @returns 模型和提供商信息，如果不存在则返回null
   */
  async getDefaultTopicNamingModel(): Promise<{ provider: ModelServiceProvider, model: Model } | null> {
    return this.getDefaultModel('topicNaming');
  }
  
  /**
   * 获取默认翻译模型
   * @returns 模型和提供商信息，如果不存在则返回null
   */
  async getDefaultTranslationModel(): Promise<{ provider: ModelServiceProvider, model: Model } | null> {
    return this.getDefaultModel('translation');
  }
} 