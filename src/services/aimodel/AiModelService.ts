/**
 * AI模型服务实现
 * 负责管理AI模型和提供商
 */
import { IAiModelService } from '../interfaces';
import { IModelRepository, IProviderRepository } from '../../repositories/interfaces';
import { AiModel, AiModelProvider } from '../../models/chat';
import { createAdapter } from './adapters/factory';
import { ConfigRepository } from '../../repositories/ConfigRepository';

/**
 * AI模型服务类
 * 实现IAiModelService接口
 */
export class AiModelService implements IAiModelService {
  /**
   * 构造函数
   * @param providerRepository 提供商仓库
   * @param modelRepository 模型仓库
   * @param configRepository 配置仓库
   */
  constructor(
    private providerRepository: IProviderRepository,
    private modelRepository: IModelRepository,
    private configRepository: ConfigRepository
  ) { }

  /**
   * 初始化AI模型服务
   */
  async initialize(): Promise<void> {
    console.log('初始化AI模型服务...');

    // 检查是否有默认提供商和模型
    const providers = await this.providerRepository.findAll();
    if (providers.length === 0) {
      // 如果没有提供商，创建默认提供商
      await this.createDefaultProviders();
    }

    console.log('AI模型服务初始化完成');
  }

  /**
   * 释放AI模型服务资源
   */
  async dispose(): Promise<void> {
    console.log('释放AI模型服务资源...');
    console.log('AI模型服务资源释放完成');
  }

  /**
   * 获取所有模型提供商
   * @returns 提供商列表
   */
  async getAllProviders(): Promise<AiModelProvider[]> {
    return this.providerRepository.findAll();
  }

  /**
   * 获取启用的模型提供商
   * @returns 启用的提供商列表
   */
  async getEnabledProviders(): Promise<AiModelProvider[]> {
    return this.providerRepository.findEnabled();
  }

  /**
   * 获取提供商详情
   * @param id 提供商ID
   * @returns 提供商详情或null（如果不存在）
   */
  async getProvider(id: string): Promise<AiModelProvider | null> {
    return this.providerRepository.findById(id);
  }

  /**
   * 添加模型提供商
   * @param provider 提供商信息（不包含ID）
   * @returns 创建的提供商
   */
  async addProvider(provider: Omit<AiModelProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiModelProvider> {
    const now = new Date();
    return this.providerRepository.create({
      ...provider,
      createdAt: now,
      updatedAt: now
    });
  }

  /**
   * 更新模型提供商
   * @param id 提供商ID
   * @param data 要更新的字段
   * @returns 更新后的提供商
   */
  async updateProvider(id: string, data: Partial<AiModelProvider>): Promise<AiModelProvider> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    return this.providerRepository.update(id, updateData);
  }

  /**
   * 删除模型提供商
   * @param id 提供商ID
   */
  async deleteProvider(id: string): Promise<void> {
    // 先删除该提供商下的所有模型
    const models = await this.modelRepository.findByProviderId(id);
    for (const model of models) {
      await this.modelRepository.delete(model.id);
    }

    // 再删除提供商
    await this.providerRepository.delete(id);
  }

  /**
   * 获取所有AI模型
   * @returns 模型列表
   */
  async getAllModels(): Promise<AiModel[]> {
    return this.modelRepository.findAll();
  }

  /**
   * 获取模型详情
   * @param id 模型ID
   * @returns 模型详情或null（如果不存在）
   */
  async getModel(id: string): Promise<AiModel | null> {
    return this.modelRepository.findById(id);
  }

  /**
   * 获取提供商下的所有模型
   * @param providerId 提供商ID
   * @returns 模型列表
   */
  async getModelsByProvider(providerId: string): Promise<AiModel[]> {
    return this.modelRepository.findByProviderId(providerId);
  }

  /**
   * 获取特定分组的模型
   * @param groupId 分组ID
   * @returns 模型列表
   */
  async getModelsByGroup(groupId: string): Promise<AiModel[]> {
    return this.modelRepository.findByGroupId(groupId);
  }

  /**
   * 获取具有特定能力的模型
   * @param capability 能力标识
   * @returns 模型列表
   */
  async getModelsByCapability(capability: string): Promise<AiModel[]> {
    return this.modelRepository.findByCapability(capability);
  }

  /**
   * 添加AI模型
   * @param model 模型信息（不包含ID）
   * @returns 创建的模型
   */
  async addModel(model: Omit<AiModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiModel> {
    return this.modelRepository.create(model);
  }

  /**
   * 添加提供商的所有可用模型
   * @param providerId 提供商ID
   * @returns 添加的模型列表
   */
  async addAllModels(providerId: string): Promise<AiModel[]> {
    // 获取提供商信息
    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new Error(`提供商 ${providerId} 不存在`);
    }

    // 获取提供商支持的所有模型列表
    const models = await this.fetchProviderModels(provider);

    // 批量添加模型
    const addedModels: AiModel[] = [];
    for (const model of models) {
      try {
        const addedModel = await this.addModel(model);
        addedModels.push(addedModel);
      } catch (err) {
        console.error(`添加模型 ${model.name} 失败:`, err);
      }
    }

    return addedModels;
  }

  /**
   * 从提供商获取支持的模型列表
   * @param provider 提供商信息
   * @returns 模型列表
   * @private
   */
  private async fetchProviderModels(provider: AiModelProvider): Promise<Omit<AiModel, 'id' | 'createdAt' | 'updatedAt'>[]> {
    const adapter = createAdapter(provider.id, provider.name, provider.config);
    if (!adapter) {
      // 如果没有适配器，返回默认模型
      return [
        {
          name: "GPT-3.5-Turbo",
          providerId: provider.id,
          groupId: "chat",
          capabilities: ["chat", "completion"],
          modelId: "gpt-3.5-turbo",
          contextWindow: 4096,
          maxTokens: 2048,
        },
        {
          name: "GPT-4",
          providerId: provider.id,
          groupId: "chat",
          capabilities: ["chat", "completion"],
          modelId: "gpt-4",
          contextWindow: 8192,
          maxTokens: 4096,
        }
      ];
    }

    try {
      // 使用适配器获取模型
      return adapter.fetchModels({
        apiKey: provider.apiKey,
        apiUrl: provider.apiUrl,
        providerId: provider.id,
        config: provider.config
      });
    } catch (error) {
      console.error(`从提供商获取模型失败: ${provider.name}`, error);
      // 出错时返回默认模型
      return [
        {
          name: "默认模型",
          providerId: provider.id,
          groupId: "default",
          capabilities: ["chat"],
          modelId: "default-model",
          contextWindow: 2048,
          maxTokens: 1024,
        }
      ];
    }
  }

  /**
   * 更新AI模型
   * @param id 模型ID
   * @param data 要更新的字段
   * @returns 更新后的模型
   */
  async updateModel(id: string, data: Partial<AiModel>): Promise<AiModel> {
    if (data.providerId) {
      const provider = await this.providerRepository.findById(data.providerId);
      if (!provider) {
        throw new Error(`提供商不存在: ${data.providerId}`);
      }
    }

    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    return this.modelRepository.update(id, updateData);
  }

  /**
   * 删除AI模型
   * @param id 模型ID
   */
  async deleteModel(id: string): Promise<void> {
    await this.modelRepository.delete(id);
  }

  /**
   * 创建默认提供商和模型
   * @private
   */
  private async createDefaultProviders(): Promise<void> {
    console.log('创建默认提供商...');

    const defaultProviders = [
      {
        id: 'openai', // 使用固定ID而不是自动生成UUID
        name: 'OpenAI',
        enabled: true,
        apiUrl: 'https://api.openai.com',
        apiKey: '',
      },
      {
        id: 'ollama', // 使用固定ID
        name: 'Ollama',
        enabled: false,
        apiUrl: 'http://localhost:11434',
        apiKey: '',
      },
      // 其他默认提供商...
    ];

    for (const provider of defaultProviders) {
      try {
        // 检查提供商是否已存在
        const existingProvider = await this.providerRepository.findById(provider.id);

        if (!existingProvider) {
          await this.providerRepository.create(provider);
          console.log(`已创建默认提供商: ${provider.name}`);
        }
      } catch (error) {
        console.error(`创建默认提供商失败: ${provider.name}`, error);
      }
    }
  }

  /**
   * 测试提供商连接
   * @param providerId 提供商ID
   * @returns 连接是否成功
   */
  async testProviderConnection(providerId: string): Promise<boolean> {
    console.log("测试提供商连接:", providerId);

    const provider = await this.getProvider(providerId);
    if (!provider) {
      console.error("提供商不存在:", providerId);
      throw new Error(`提供商不存在: ${providerId}`);
    }

    console.log("获取到提供商:", provider.name, provider.id);

    // 传递提供商名称和配置
    const adapter = createAdapter(providerId, provider.name, provider.config);

    if (!adapter) {
      console.error("没有适配器可用:", provider.name, providerId);
      throw new Error(`没有适配器可用于提供商: ${provider.name || providerId}`);
    }

    console.log("找到适配器，准备测试连接");
    console.log("provider:", provider);
    console.log("apiUrl:", provider.apiUrl);
    console.log("apiKey:", provider.apiKey);
    console.log("adapterType:", provider.config?.adapterType || "auto");

    try {
      const result = await adapter.testConnection({
        apiKey: provider.apiKey,
        apiUrl: provider.apiUrl,
        providerId: provider.id,
        config: provider.config
      });

      console.log("连接测试结果:", result);
      return result;
    } catch (error) {
      console.error("连接测试失败:", error);
      return false;
    }
  }

  /**
   * 从提供商API获取模型
   * @param providerId 提供商ID
   * @returns 模型列表
   */
  async fetchModelsFromProvider(providerId: string): Promise<AiModel[]> {
    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new Error(`提供商不存在: ${providerId}`);
    }

    // 传递提供商名称和配置
    const adapter = createAdapter(providerId, provider.name, provider.config);

    if (!adapter) {
      throw new Error(`没有适配器可用于提供商: ${provider.name || providerId}`);
    }

    const models = await adapter.fetchModels({
      apiKey: provider.apiKey,
      apiUrl: provider.apiUrl,
      providerId: provider.id,
      config: provider.config
    });

    // 将获取的模型保存到数据库
    const savedModels: AiModel[] = [];
    for (const model of models) {
      try {
        // 检查模型是否已存在
        const existingModels = await this.modelRepository.findByProviderId(providerId);
        const existingModel = existingModels.find(m => m.modelId === model.modelId);

        if (existingModel) {
          // 更新现有模型
          const updatedModel = await this.updateModel(existingModel.id, model);
          savedModels.push(updatedModel);
        } else {
          // 添加新模型
          const newModel = await this.addModel(model);
          savedModels.push(newModel);
        }
      } catch (error) {
        console.error(`保存模型失败: ${model.name}`, error);
      }
    }

    return savedModels;
  }

  /**
   * 获取当前选中的模型
   * @returns 当前选中的提供商和模型信息，如果未设置则返回默认模型
   */
  async getCurrentModel(): Promise<{ provider: AiModelProvider, model: AiModel } | null> {
    // 从配置中获取当前选中的模型信息
    const currentProviderId = await this.configRepository.getValue('current_provider_id');
    const currentModelId = await this.configRepository.getValue('current_model_id');

    console.log(`获取当前模型: providerId=${currentProviderId}, modelId=${currentModelId}`);

    if (currentProviderId && currentModelId) {
      const provider = await this.getProvider(currentProviderId);

      // 如果提供商存在且已启用
      if (provider && provider.enabled) {
        // 查找模型 - 使用 id 属性查找
        const models = await this.getModelsByProvider(provider.id);
        const model = models.find(m => m.id === currentModelId);
        if (model) {
          console.log(`找到当前模型: ${model.name}, id=${model.id}`);
          return { provider, model };
        } else {
          console.log(`未找到模型: id=${currentModelId}`);
        }
      } else {
        console.log(`提供商不存在或未启用: ${currentProviderId}`);
      }
    } else {
      console.log(`未设置当前模型`);
    }

    // 如果没有当前选中的模型或者找不到对应的模型，返回默认模型
    console.log(`返回默认模型`);
    return this.getDefaultModel();
  }

  /**
   * 设置当前选中的模型
   * @param model 模型对象
   */
  async setCurrentModel(model: AiModel): Promise<void> {
    console.log(`设置当前模型: ${model.name}, id=${model.id}, modelId=${model.modelId}, providerId=${model.providerId}`);
    
    // 验证提供商是否存在
    const provider = await this.getProvider(model.providerId);
    if (!provider) {
      throw new Error(`提供商不存在: ${model.providerId}`);
    }

    if (!provider.enabled) {
      throw new Error(`提供商已禁用: ${model.providerId}`);
    }

    // 验证模型是否存在
    const models = await this.getModelsByProvider(model.providerId);
    const modelExists = models.some(m => m.id === model.id);
    if (!modelExists) {
      throw new Error(`模型不存在: ${model.id}`);
    }

    // 保存当前选中的模型信息
    // 使用模型的 id 属性作为配置值
    await this.configRepository.setValue('current_provider_id', model.providerId);
    await this.configRepository.setValue('current_model_id', model.id);
    
    console.log(`当前模型已设置为: ${model.name}, id=${model.id}`);
  }

  /**
   * 设置默认模型
   * @param model 模型对象
   */
  async setDefaultModel(model: AiModel): Promise<void> {
    try {
      console.log(`设置默认模型: ${model.name}, id=${model.id}, providerId=${model.providerId}`);
      
      // 保存到配置表中
      await this.configRepository.setValue('default_provider_id', model.providerId);
      await this.configRepository.setValue('default_model_id', model.id);

      // 同时设置为当前模型
      await this.setCurrentModel(model);

      console.log(`默认模型已设置: ${model.name}, id=${model.id}`);
    } catch (error) {
      console.error("设置默认模型失败:", error);
      throw error;
    }
  }

  /**
   * 获取默认模型
   * @returns 默认的提供商和模型信息，如果没有可用的则返回null
   */
  async getDefaultModel(): Promise<{ provider: AiModelProvider, model: AiModel } | null> {
    console.log(`获取默认模型`);
    
    // 尝试从配置中获取默认模型
    const defaultProviderId = await this.configRepository.getValue('default_provider_id');
    const defaultModelId = await this.configRepository.getValue('default_model_id');
    
    console.log(`配置的默认模型: providerId=${defaultProviderId}, modelId=${defaultModelId}`);
    
    // 如果有配置的默认模型，尝试使用它
    if (defaultProviderId && defaultModelId) {
      const provider = await this.getProvider(defaultProviderId);
      
      // 如果提供商存在且已启用
      if (provider && provider.enabled) {
        // 查找模型
        const models = await this.getModelsByProvider(provider.id);
        const model = models.find(m => m.id === defaultModelId);
        if (model) {
          console.log(`使用配置的默认模型: ${model.name}, id=${model.id}`);
          return { provider, model };
        }
      }
    }
    
    // 如果没有配置的默认模型或找不到，使用第一个启用的提供商的第一个模型
    console.log(`尝试使用第一个可用的模型作为默认模型`);
    
    // 获取所有启用的提供商
    const providers = await this.getEnabledProviders();

    // 查找第一个启用的提供商
    const enabledProvider = providers.find(p => p.enabled);
    if (!enabledProvider) {
      console.log(`没有启用的提供商`);
      return null;
    }

    // 获取该提供商下的模型
    const models = await this.getModelsByProvider(enabledProvider.id);

    // 如果有模型，返回第一个
    if (models && models.length > 0) {
      console.log(`使用第一个可用的模型作为默认模型: ${models[0].name}, id=${models[0].id}`);
      return {
        provider: enabledProvider,
        model: models[0]
      };
    }

    console.log(`没有可用的模型`);
    return null;
  }

  /**
   * 使用提供商对象直接测试连接，无需先保存到数据库
   * @param provider 提供商对象
   * @returns 连接测试结果
   */
  async testProviderConnectionWithProvider(provider: AiModelProvider): Promise<boolean> {
    console.log("使用提供商对象直接测试连接:", provider.name, provider.id);

    // 传递提供商名称和配置
    const adapter = createAdapter(provider.id, provider.name, provider.config);

    if (!adapter) {
      console.error("没有适配器可用:", provider.name, provider.id);
      throw new Error(`没有适配器可用于提供商: ${provider.name || provider.id}`);
    }

    console.log("找到适配器，准备测试连接");
    console.log("provider:", provider);
    console.log("apiUrl:", provider.apiUrl);
    console.log("apiKey:", provider.apiKey);
    console.log("adapterType:", provider.config?.adapterType || "auto");

    try {
      const result = await adapter.testConnection({
        apiKey: provider.apiKey,
        apiUrl: provider.apiUrl,
        providerId: provider.id,
        config: provider.config
      });

      console.log("连接测试结果:", result);
      return result;
    } catch (error) {
      console.error("连接测试失败:", error);
      return false;
    }
  }
} 