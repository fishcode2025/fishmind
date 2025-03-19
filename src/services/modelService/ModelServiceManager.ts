import { ModelServiceProvider, Model } from './models/types';
import { ModelServiceStorage } from './storage/ModelServiceStorage';
import { createAdapter } from './adapters/index';
import { configService } from '../system/ConfigService';

/**
 * 模型服务管理器
 * 负责管理所有模型服务提供商
 */
export class ModelServiceManager {
  private storage: ModelServiceStorage;
  
  constructor() {
    this.storage = new ModelServiceStorage();
  }
  
  /**
   * 获取所有配置的服务提供商
   * @returns 服务提供商列表
   */
  async getAllProviders(): Promise<ModelServiceProvider[]> {
    const providers = await this.storage.loadAllProviders();
    
    // 过滤掉未启用供应商的模型
    return providers.map(provider => {
      if (!provider.enabled) {
        // 如果供应商未启用，返回没有模型的供应商信息
        return {
          ...provider,
          models: []
        };
      }
      return provider;
    });
  }
  
  /**
   * 获取特定提供商
   * @param id 提供商ID
   * @returns 提供商配置，如果不存在则返回null
   */
  async getProvider(id: string): Promise<ModelServiceProvider | null> {
    const providers = await this.storage.loadAllProviders();
    return providers.find(p => p.id === id) || null;
  }
  
  /**
   * 保存服务提供商配置
   * @param provider 提供商配置
   */
  async saveProvider(provider: ModelServiceProvider): Promise<void> {
    
    // 保存更新后的提供商
    await this.storage.saveProvider(provider);
  }
  
  /**
   * 删除提供商配置
   * @param id 提供商ID
   */
  async removeProvider(id: string): Promise<void> {
    await this.storage.deleteProvider(id);
  }
  
  /**
   * 测试提供商连接
   * @param providerId 提供商ID
   * @returns 连接是否成功
   */
  async testConnection(providerId: string): Promise<boolean> {
    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    
    const adapter = createAdapter(providerId);
    if (!adapter) {
      throw new Error(`No adapter available for provider: ${providerId}`);
    }
    
    return adapter.testConnection({
      apiKey: provider.apiKey,
      apiUrl: provider.apiUrl
    });
  }
  
  /**
   * 从提供商获取可用模型列表
   * @param providerId 提供商ID
   * @returns 模型列表
   */
  async fetchModels(providerId: string): Promise<Model[]> {
    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    
    const adapter = createAdapter(providerId);
    if (!adapter) {
      throw new Error(`No adapter available for provider: ${providerId}`);
    }
    
    return adapter.fetchModels({
      apiKey: provider.apiKey,
      apiUrl: provider.apiUrl
    });
  }
  
  /**
   * 获取默认的服务提供商列表
   */
  getDefaultProviders(): ModelServiceProvider[] {
    const enabledProviders = configService.getEnabledProviders();
    
    return enabledProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      enabled: true,
      apiKey: '',
      apiUrl: provider.api.url,
      models: [],
      icon: provider.icon
    }));
  }
  
  /**
   * 初始化服务提供商
   * 如果存储中没有提供商，则添加默认提供商
   * 如果存储中已有提供商，则确保默认提供商都存在
   */
  async initializeProviders(): Promise<void> {
    let providers = await this.storage.loadAllProviders();
    
    // 清理重复的供应商
    const uniqueProviders = new Map<string, ModelServiceProvider>();
    providers.forEach(provider => {
      // 如果已存在相同ID的供应商，保留enabled状态为true的那个
      const existingProvider = uniqueProviders.get(provider.id);
      if (!existingProvider || provider.enabled) {
        uniqueProviders.set(provider.id, provider);
      }
    });
    providers = Array.from(uniqueProviders.values());
    
    if (providers.length === 0) {
      // 如果没有任何提供商，添加所有默认提供商
      const defaultProviders = this.getDefaultProviders();
      for (const provider of defaultProviders) {
        await this.storage.saveProvider(provider);
      }
    } else {
      // 如果已有提供商，确保默认提供商都存在
      const defaultProviders = this.getDefaultProviders();
      const existingProviderIds = providers.map(p => p.id);
      
      for (const defaultProvider of defaultProviders) {
        if (!existingProviderIds.includes(defaultProvider.id)) {
          // 只添加不存在的默认提供商
          await this.storage.saveProvider(defaultProvider);
        }
      }
      
      // 保存清理后的供应商列表
      for (const provider of providers) {
        await this.storage.saveProvider(provider);
      }
    }
  }
  
  /**
   * 获取当前选中的模型
   * @returns 当前选中的提供商和模型信息，如果未设置则返回默认模型
   */
  async getCurrentModel(): Promise<{provider: ModelServiceProvider, model: Model} | null> {
    // 从存储中获取当前选中的模型信息
    const currentModelData = await this.storage.loadCurrentModel();
    
    // 如果有存储的当前模型信息
    if (currentModelData && currentModelData.providerId && currentModelData.modelId) {
      const provider = await this.getProvider(currentModelData.providerId);
      
      // 如果提供商存在且已启用
      if (provider && provider.enabled) {
        // 查找模型
        const model = provider.models.find(m => m.id === currentModelData.modelId);
        if (model) {
          return { provider, model };
        }
      }
    }
    
    // 如果没有当前选中的模型或者找不到对应的模型，尝试返回默认模型
    return await this.getDefaultModel();
  }
  
  /**
   * 设置当前选中的模型
   * @param providerId 提供商ID
   * @param modelId 模型ID
   */
  async setCurrentModel(providerId: string, modelId: string): Promise<void> {
    // 验证提供商和模型是否存在
    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    
    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${providerId}`);
    }
    
    // 如果提供商没有模型列表，尝试获取
    if (!provider.models || provider.models.length === 0) {
      try {
        provider.models = await this.fetchModels(providerId);
        await this.saveProvider(provider);
      } catch (error) {
        throw new Error(`Failed to fetch models for provider: ${providerId}`);
      }
    }
    
    // 验证模型是否存在
    const modelExists = provider.models.some(m => m.id === modelId);
    if (!modelExists) {
      throw new Error(`Model not found: ${modelId} for provider: ${providerId}`);
    }
    
    // 保存当前选中的模型信息
    await this.storage.saveCurrentModel({
      providerId,
      modelId
    });
  }
  
  /**
   * 获取默认模型
   * 按照以下优先级选择：
   * 1. 第一个启用的提供商的第一个模型
   * 2. 如果没有启用的提供商，返回null
   * @returns 默认的提供商和模型信息，如果没有可用的则返回null
   */
  async getDefaultModel(): Promise<{provider: ModelServiceProvider, model: Model} | null> {
    const providers = await this.getAllProviders();
    
    // 查找第一个启用的提供商
    const enabledProvider = providers.find(p => p.enabled);
    if (!enabledProvider) {
      return null;
    }
    
    // 如果提供商没有模型列表，尝试获取
    if (!enabledProvider.models || enabledProvider.models.length === 0) {
      try {
        enabledProvider.models = await this.fetchModels(enabledProvider.id);
        await this.saveProvider(enabledProvider);
      } catch (error) {
        console.error(`Failed to fetch models for provider: ${enabledProvider.id}`, error);
        return null;
      }
    }
    
    // 如果有模型，返回第一个
    if (enabledProvider.models && enabledProvider.models.length > 0) {
      return {
        provider: enabledProvider,
        model: enabledProvider.models[0]
      };
    }
    
    return null;
  }
}
