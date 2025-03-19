import { StorageService } from '../storage/StorageService';

// 默认模型类型
export type DefaultModelType = 'assistant' | 'topicNaming' | 'translation';

// 默认模型配置接口
export interface DefaultModelConfig {
  providerId: string;
  modelId: string;
  name: string;
}

/**
 * 默认模型存储服务
 * 负责保存和加载默认模型配置
 */
export class DefaultModelStorage {
  private storage: StorageService;
  private readonly STORAGE_KEY_PREFIX = 'default_model_';
  
  constructor() {
    this.storage = new StorageService();
  }
  
  /**
   * 保存默认模型配置
   * @param type 模型类型
   * @param config 模型配置
   */
  async saveDefaultModel(type: DefaultModelType, config: DefaultModelConfig): Promise<void> {
    const key = this.getStorageKey(type);
    await this.storage.setItem(key, JSON.stringify(config));
  }
  
  /**
   * 加载默认模型配置
   * @param type 模型类型
   * @returns 模型配置，如果不存在则返回null
   */
  async loadDefaultModel(type: DefaultModelType): Promise<DefaultModelConfig | null> {
    const key = this.getStorageKey(type);
    const data = await this.storage.getItem(key);
    
    if (!data) {
      return null;
    }
    
    try {
      return JSON.parse(data) as DefaultModelConfig;
    } catch (error) {
      console.error(`Failed to parse default model config for ${type}`, error);
      return null;
    }
  }
  
  /**
   * 获取存储键
   * @param type 模型类型
   * @returns 存储键
   */
  private getStorageKey(type: DefaultModelType): string {
    return `${this.STORAGE_KEY_PREFIX}${type}`;
  }
} 