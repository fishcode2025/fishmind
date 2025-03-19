import { ModelServiceProvider } from '../models/types';

/**
 * 模型服务存储类
 * 负责持久化存储模型服务配置
 */
export class ModelServiceStorage {
  private readonly STORAGE_KEY = 'model_service_providers';
  private readonly CURRENT_MODEL_KEY = 'current_model';
  
  /**
   * 加载所有服务提供商配置
   * @returns 服务提供商列表
   */
  async loadAllProviders(): Promise<ModelServiceProvider[]> {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) {
        return [];
      }
      
      return JSON.parse(storedData);
    } catch (error) {
      console.error('Failed to load providers from storage', error);
      return [];
    }
  }
  
  /**
   * 保存服务提供商配置
   * @param provider 服务提供商配置
   */
  async saveProvider(provider: ModelServiceProvider): Promise<void> {
    try {
      const providers = await this.loadAllProviders();
      const existingIndex = providers.findIndex(p => p.id === provider.id);
      
      if (existingIndex >= 0) {
        // 更新现有提供商
        providers[existingIndex] = provider;
      } else {
        // 添加新提供商
        providers.push(provider);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(providers));
    } catch (error) {
      console.error('Failed to save provider to storage', error);
      throw error;
    }
  }
  
  /**
   * 删除服务提供商配置
   * @param id 服务提供商ID
   */
  async deleteProvider(id: string): Promise<void> {
    try {
      const providers = await this.loadAllProviders();
      const filteredProviders = providers.filter(p => p.id !== id);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredProviders));
    } catch (error) {
      console.error('Failed to delete provider from storage', error);
      throw error;
    }
  }
  
  /**
   * 保存当前选中的模型信息
   * @param data 包含提供商ID和模型ID的对象
   */
  async saveCurrentModel(data: { providerId: string, modelId: string }): Promise<void> {
    try {
      localStorage.setItem(this.CURRENT_MODEL_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save current model to storage', error);
      throw error;
    }
  }
  
  /**
   * 加载当前选中的模型信息
   * @returns 包含提供商ID和模型ID的对象，如果未设置则返回null
   */
  async loadCurrentModel(): Promise<{ providerId: string, modelId: string } | null> {
    try {
      const storedData = localStorage.getItem(this.CURRENT_MODEL_KEY);
      if (!storedData) {
        return null;
      }
      
      return JSON.parse(storedData);
    } catch (error) {
      console.error('Failed to load current model from storage', error);
      return null;
    }
  }
}
