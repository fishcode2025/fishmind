/**
 * AI模型服务单元测试
 */
import { AiModelService } from "../AiModelService";
import {
  IModelRepository,
  IProviderRepository,
} from "../../../repositories/interfaces";
import { AiModel, AiModelProvider } from "../../../models/chat";
import { ConfigRepository } from "../../../repositories/ConfigRepository";

// 模拟提供商仓库
const mockProviderRepository: jest.Mocked<IProviderRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  findByName: jest.fn(),
  findEnabled: jest.fn(),
};

// 模拟模型仓库
const mockModelRepository: jest.Mocked<IModelRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  findByProviderId: jest.fn(),
  findByGroupId: jest.fn(),
  findByCapability: jest.fn(),
};

// 模拟配置仓库
const mockConfigRepository: jest.Mocked<ConfigRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  setValue: jest.fn(),
  getValue: jest.fn(),
  setValues: jest.fn(),
  getValues: jest.fn(),
  findByGroup: jest.fn(),
} as unknown as jest.Mocked<ConfigRepository>;

describe("AiModelService", () => {
  let aiModelService: AiModelService;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();

    // 创建AI模型服务实例
    aiModelService = new AiModelService(
      mockProviderRepository,
      mockModelRepository,
      mockConfigRepository
    );
  });

  describe("initialize", () => {
    it("如果没有提供商，应该创建默认提供商", async () => {
      // 模拟没有提供商
      mockProviderRepository.findAll.mockResolvedValueOnce([]);

      // 模拟创建提供商和模型
      mockProviderRepository.create.mockImplementation(async (provider) => {
        return {
          id: "provider-id",
          ...provider,
        } as AiModelProvider;
      });

      mockModelRepository.create.mockImplementation(async (model) => {
        return {
          id: "model-id",
          ...model,
        } as AiModel;
      });

      await aiModelService.initialize();

      // 验证调用
      expect(mockProviderRepository.findAll).toHaveBeenCalled();
      expect(mockProviderRepository.create).toHaveBeenCalledTimes(2); // OpenAI和本地模型
      expect(mockModelRepository.create).toHaveBeenCalledTimes(3); // GPT-3.5, GPT-4和Llama 2
    });

    it("如果已有提供商，不应该创建默认提供商", async () => {
      // 模拟已有提供商
      mockProviderRepository.findAll.mockResolvedValueOnce([
        { id: "existing-provider" } as AiModelProvider,
      ]);

      await aiModelService.initialize();

      // 验证调用
      expect(mockProviderRepository.findAll).toHaveBeenCalled();
      expect(mockProviderRepository.create).not.toHaveBeenCalled();
      expect(mockModelRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("提供商管理", () => {
    it("应该获取所有提供商", async () => {
      const mockProviders = [
        { id: "provider-1" } as AiModelProvider,
        { id: "provider-2" } as AiModelProvider,
      ];

      mockProviderRepository.findAll.mockResolvedValueOnce(mockProviders);

      const providers = await aiModelService.getAllProviders();

      expect(providers).toEqual(mockProviders);
      expect(mockProviderRepository.findAll).toHaveBeenCalled();
    });

    it("应该获取启用的提供商", async () => {
      const mockEnabledProviders = [
        { id: "provider-1", enabled: true } as AiModelProvider,
      ];

      mockProviderRepository.findEnabled.mockResolvedValueOnce(
        mockEnabledProviders
      );

      const providers = await aiModelService.getEnabledProviders();

      expect(providers).toEqual(mockEnabledProviders);
      expect(mockProviderRepository.findEnabled).toHaveBeenCalled();
    });

    it("应该添加提供商", async () => {
      const providerData = {
        name: "Test Provider",
        enabled: true,
        apiUrl: "https://test.api",
      };

      const createdProvider = {
        id: "new-provider-id",
        ...providerData,
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-01-01T00:00:00Z"),
      };

      mockProviderRepository.create.mockResolvedValueOnce(createdProvider);

      const result = await aiModelService.addProvider(providerData);

      expect(result).toEqual(createdProvider);
      expect(mockProviderRepository.create).toHaveBeenCalledWith({
        ...providerData,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it("应该更新提供商", async () => {
      const providerId = "provider-id";
      const updateData = {
        name: "Updated Provider",
        enabled: false,
      };

      const updatedProvider = {
        id: providerId,
        ...updateData,
        apiUrl: "https://test.api",
        updatedAt: new Date("2023-01-02T00:00:00Z"),
      };

      mockProviderRepository.update.mockResolvedValueOnce(updatedProvider);

      const result = await aiModelService.updateProvider(
        providerId,
        updateData
      );

      expect(result).toEqual(updatedProvider);
      expect(mockProviderRepository.update).toHaveBeenCalledWith(providerId, {
        ...updateData,
        updatedAt: expect.any(String),
      });
    });

    it("删除提供商时应该同时删除其模型", async () => {
      const providerId = "provider-id";
      const providerModels = [
        { id: "model-1" } as AiModel,
        { id: "model-2" } as AiModel,
      ];

      mockModelRepository.findByProviderId.mockResolvedValueOnce(
        providerModels
      );

      await aiModelService.deleteProvider(providerId);

      // 验证调用
      expect(mockModelRepository.findByProviderId).toHaveBeenCalledWith(
        providerId
      );
      expect(mockModelRepository.delete).toHaveBeenCalledTimes(2);
      expect(mockModelRepository.delete).toHaveBeenNthCalledWith(1, "model-1");
      expect(mockModelRepository.delete).toHaveBeenNthCalledWith(2, "model-2");
      expect(mockProviderRepository.delete).toHaveBeenCalledWith(providerId);
    });
  });

  describe("模型管理", () => {
    it("应该获取所有模型", async () => {
      const mockModels = [
        { id: "model-1" } as AiModel,
        { id: "model-2" } as AiModel,
      ];

      mockModelRepository.findAll.mockResolvedValueOnce(mockModels);

      const models = await aiModelService.getAllModels();

      expect(models).toEqual(mockModels);
      expect(mockModelRepository.findAll).toHaveBeenCalled();
    });

    it("应该获取提供商下的模型", async () => {
      const providerId = "provider-id";
      const mockModels = [
        { id: "model-1", providerId } as AiModel,
        { id: "model-2", providerId } as AiModel,
      ];

      mockModelRepository.findByProviderId.mockResolvedValueOnce(mockModels);

      const models = await aiModelService.getModelsByProvider(providerId);

      expect(models).toEqual(mockModels);
      expect(mockModelRepository.findByProviderId).toHaveBeenCalledWith(
        providerId
      );
    });

    it("添加模型时应该验证提供商是否存在", async () => {
      const modelData = {
        name: "Test Model",
        providerId: "provider-id",
        groupId: "test-group",
        capabilities: ["test"],
        modelId: "test-model-id",
        contextWindow: 4096,
        maxTokens: 1000,
      };

      // 模拟提供商不存在
      mockProviderRepository.findById.mockResolvedValueOnce(null);

      // 期望抛出错误
      await expect(aiModelService.addModel(modelData)).rejects.toThrow(
        "提供商不存在"
      );

      // 验证调用
      expect(mockProviderRepository.findById).toHaveBeenCalledWith(
        "provider-id"
      );
      expect(mockModelRepository.create).not.toHaveBeenCalled();
    });

    it("应该添加模型", async () => {
      const modelData = {
        name: "Test Model",
        providerId: "provider-id",
        groupId: "test-group",
        capabilities: ["test"],
        modelId: "test-model-id",
        contextWindow: 4096,
        maxTokens: 1000,
      };

      // 模拟提供商存在
      mockProviderRepository.findById.mockResolvedValueOnce({
        id: "provider-id",
      } as AiModelProvider);

      const createdModel = {
        id: "new-model-id",
        ...modelData,
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-01-01T00:00:00Z"),
      };

      mockModelRepository.create.mockResolvedValueOnce(createdModel);

      const result = await aiModelService.addModel(modelData);

      expect(result).toEqual(createdModel);
      expect(mockProviderRepository.findById).toHaveBeenCalledWith(
        "provider-id"
      );
      expect(mockModelRepository.create).toHaveBeenCalledWith({
        ...modelData,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it("更新模型时如果更改提供商，应该验证新提供商是否存在", async () => {
      const modelId = "model-id";
      const updateData = {
        providerId: "new-provider-id",
      };

      // 模拟提供商不存在
      mockProviderRepository.findById.mockResolvedValueOnce(null);

      // 期望抛出错误
      await expect(
        aiModelService.updateModel(modelId, updateData)
      ).rejects.toThrow("提供商不存在");

      // 验证调用
      expect(mockProviderRepository.findById).toHaveBeenCalledWith(
        "new-provider-id"
      );
      expect(mockModelRepository.update).not.toHaveBeenCalled();
    });

    it("应该更新模型", async () => {
      const modelId = "model-id";
      const updateData = {
        name: "Updated Model",
        capabilities: ["test", "new-capability"],
      };

      const updatedModel = {
        id: modelId,
        ...updateData,
        providerId: "provider-id",
        groupId: "test-group",
        modelId: "model-id",
        contextWindow: 4096,
        maxTokens: 1000,
        updatedAt: new Date("2023-01-02T00:00:00Z"),
      };

      mockModelRepository.update.mockResolvedValueOnce(updatedModel);

      const result = await aiModelService.updateModel(modelId, updateData);

      expect(result).toEqual(updatedModel);
      expect(mockModelRepository.update).toHaveBeenCalledWith(modelId, {
        ...updateData,
        updatedAt: expect.any(String),
      });
    });
  });
});
