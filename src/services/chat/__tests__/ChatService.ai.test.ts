/**
 * 聊天服务 AI 回复生成方法的单元测试
 */
import { ChatService } from "../ChatService";
import { Topic, Message, AiModel, AiModelProvider } from "../../../models/chat";
import {
  ITopicRepository,
  IMessageRepository,
  IAssistantRepository,
} from "../../../repositories/interfaces";
import { IAiModelService, IMcpToolService } from "../../interfaces";
import { MessageStatus } from "../../../models/messageStatus";
import { StreamEvent, StreamEventType } from "../StreamEventHandler";

// 模拟全局 fetch
global.fetch = jest.fn();

// 模拟存储库和服务
const mockTopicRepository: jest.Mocked<ITopicRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  findByTitle: jest.fn(),
  findRecent: jest.fn(),
  incrementMessageCount: jest.fn(),
  updatePreview: jest.fn(),
  findByAssistantId: jest.fn(),
};

const mockMessageRepository: jest.Mocked<IMessageRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  findByTopicId: jest.fn(),
  findByTopicIdPaginated: jest.fn(),
  findLastByTopicId: jest.fn(),
  deleteByTopicId: jest.fn(),
};

const mockAiModelService: jest.Mocked<IAiModelService> = {
  initialize: jest.fn(),
  dispose: jest.fn(),
  getAllProviders: jest.fn(),
  getEnabledProviders: jest.fn(),
  getProvider: jest.fn(),
  addProvider: jest.fn(),
  updateProvider: jest.fn(),
  deleteProvider: jest.fn(),
  getAllModels: jest.fn(),
  getModel: jest.fn(),
  getModelsByProvider: jest.fn(),
  getModelsByGroup: jest.fn(),
  getModelsByCapability: jest.fn(),
  addModel: jest.fn(),
  addAllModels: jest.fn(),
  updateModel: jest.fn(),
  deleteModel: jest.fn(),
  testProviderConnection: jest.fn(),
  testProviderConnectionWithProvider: jest.fn(),
  fetchModelsFromProvider: jest.fn(),
  getCurrentModel: jest.fn(),
  setCurrentModel: jest.fn(),
  getDefaultModel: jest.fn(),
  setDefaultModel: jest.fn(),
};

// 添加缺少的模拟对象
const mockAssistantRepository: jest.Mocked<IAssistantRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  findByName: jest.fn(),
  findDefault: jest.fn(),
  setDefault: jest.fn(),
};

const mockMcpToolService: jest.Mocked<IMcpToolService> = {
  initialize: jest.fn(),
  dispose: jest.fn(),
  listTools: jest.fn(),
  callTool: jest.fn(),
  listResources: jest.fn(),
  readResource: jest.fn(),
  listPrompts: jest.fn(),
  getPrompt: jest.fn(),
  getAllAvailableTools: jest.fn(),
  getAllAvailableResources: jest.fn(),
  getAllAvailablePrompts: jest.fn(),
  refreshTools: jest.fn(),
  refreshResources: jest.fn(),
  refreshPrompts: jest.fn(),
};

// 测试数据
const mockTopic: Topic = {
  id: "1",
  title: "测试话题",
  createdAt: "2023-01-01T00:00:00.000Z",
  updatedAt: "2023-01-01T00:00:00.000Z",
  messageCount: 3,
  preview: "这是一个测试话题",
};

const mockMessages: Message[] = [
  {
    id: "1",
    topicId: "1",
    role: "user",
    content: "你好",
    timestamp: "2023-01-01T00:00:00.000Z",
    modelId: undefined,
    providerId: undefined,
  },
  {
    id: "2",
    topicId: "1",
    role: "assistant",
    content: "你好，有什么可以帮助你的？",
    timestamp: "2023-01-01T00:00:01.000Z",
    modelId: "model-1",
    providerId: "provider-1",
  },
];

const mockProvider: AiModelProvider = {
  id: "provider-1",
  name: "OpenAI",
  enabled: true,
  apiUrl: "https://api.openai.com",
  apiKey: "sk-test",
  createdAt: new Date("2023-01-01T00:00:00.000Z"),
  updatedAt: new Date("2023-01-01T00:00:00.000Z"),
};

const mockModel: AiModel = {
  id: "model-1",
  name: "GPT-3.5 Turbo",
  providerId: "provider-1",
  groupId: "gpt",
  capabilities: ["chat"],
  modelId: "gpt-3.5-turbo",
  contextWindow: 4096,
  maxTokens: 1000,
  createdAt: new Date("2023-01-01T00:00:00.000Z"),
  updatedAt: new Date("2023-01-01T00:00:00.000Z"),
};

describe("ChatService - AI 回复生成", () => {
  let chatService: ChatService;

  beforeEach(() => {
    // 重置所有模拟函数
    jest.clearAllMocks();

    // 创建聊天服务实例
    chatService = new ChatService(
      mockTopicRepository,
      mockMessageRepository,
      mockAiModelService,
      mockAssistantRepository,
      mockMcpToolService
    );

    // 模拟日期
    jest
      .spyOn(global.Date.prototype, "toISOString")
      .mockReturnValue("2023-01-01T00:00:00.000Z");

    // 重置 fetch 模拟
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("generateAiReplyStream", () => {
    it("应该成功生成 AI 回复", async () => {
      // 准备
      const topicId = "1";
      const aiResponse = "这是 AI 的回复";
      const initialMessage: Message = {
        id: "3",
        topicId,
        role: "assistant",
        content: "正在生成回复...",
        timestamp: "2023-01-01T00:00:00.000Z",
        modelId: "model-1",
        providerId: "provider-1",
      };
      const updatedMessage: Message = {
        ...initialMessage,
        content: aiResponse,
      };

      // 模拟存储库和服务
      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      mockMessageRepository.findByTopicId.mockResolvedValue(mockMessages);
      mockAiModelService.getCurrentModel.mockResolvedValue({
        provider: mockProvider,
        model: mockModel,
      });
      mockMessageRepository.create.mockResolvedValue(initialMessage);
      mockMessageRepository.update.mockResolvedValue(updatedMessage);
      mockTopicRepository.incrementMessageCount.mockResolvedValue();
      mockTopicRepository.update.mockResolvedValue({
        ...mockTopic,
        lastModelId: "model-1",
        lastProviderId: "provider-1",
        updatedAt: "2023-01-01T00:00:00.000Z",
      });
      mockTopicRepository.updatePreview.mockResolvedValue();

      // 模拟 fetch 响应
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: aiResponse,
              },
            },
          ],
        }),
      });

      // 创建事件接收回调
      const onEvent = jest.fn();

      // 执行
      const result = await chatService.generateAiReplyStream(topicId, onEvent);

      // 验证
      expect(mockTopicRepository.findById).toHaveBeenCalledWith(topicId);
      expect(mockMessageRepository.findByTopicId).toHaveBeenCalledWith(topicId);
      expect(mockAiModelService.getCurrentModel).toHaveBeenCalled();
      expect(mockMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          topicId,
          role: "assistant",
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/chat/completions"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer sk-test",
          }),
          body: expect.any(String),
        })
      );
      expect(mockMessageRepository.update).toHaveBeenCalled();
      expect(mockTopicRepository.incrementMessageCount).toHaveBeenCalledWith(
        topicId
      );
      expect(result).toEqual(updatedMessage);
    });

    it("应该在话题不存在时抛出错误", async () => {
      // 准备
      const topicId = "nonexistent";
      mockTopicRepository.findById.mockResolvedValue(null);
      const onEvent = jest.fn();

      // 执行和验证
      await expect(
        chatService.generateAiReplyStream(topicId, onEvent)
      ).rejects.toThrow(expect.stringMatching(/话题不存在/));
    });

    it("应该在话题没有消息时抛出错误", async () => {
      // 准备
      const topicId = "1";
      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      mockMessageRepository.findByTopicId.mockResolvedValue([]);
      const onEvent = jest.fn();

      // 执行和验证
      await expect(
        chatService.generateAiReplyStream(topicId, onEvent)
      ).rejects.toThrow(expect.stringMatching(/话题没有消息/));
    });

    it("应该在未设置默认模型时抛出错误", async () => {
      // 准备
      const topicId = "1";
      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      mockMessageRepository.findByTopicId.mockResolvedValue(mockMessages);
      mockAiModelService.getCurrentModel.mockResolvedValue(null);
      const onEvent = jest.fn();

      // 执行和验证
      await expect(
        chatService.generateAiReplyStream(topicId, onEvent)
      ).rejects.toThrow(expect.stringMatching(/未设置默认模型/));
    });

    it("应该处理 API 请求失败的情况", async () => {
      // 准备
      const topicId = "1";
      const initialMessage: Message = {
        id: "3",
        topicId,
        role: "assistant",
        content: "正在生成回复...",
        timestamp: "2023-01-01T00:00:00.000Z",
        modelId: "model-1",
        providerId: "provider-1",
      };
      const errorMessage = "生成回复失败: 请求失败: 401";
      const updatedMessage: Message = {
        ...initialMessage,
        content: errorMessage,
      };

      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      mockMessageRepository.findByTopicId.mockResolvedValue(mockMessages);
      mockAiModelService.getCurrentModel.mockResolvedValue({
        provider: mockProvider,
        model: mockModel,
      });
      mockMessageRepository.create.mockResolvedValue(initialMessage);
      mockMessageRepository.update.mockResolvedValue(updatedMessage);

      // 模拟 fetch 失败
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "未授权" } }),
      });

      const onEvent = jest.fn();

      // 执行和验证
      try {
        await chatService.generateAiReplyStream(topicId, onEvent);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
        expect(mockMessageRepository.update).toHaveBeenCalledWith(
          "3",
          expect.objectContaining({
            content: expect.stringContaining("生成回复"),
          })
        );
      }
    });

    it("应该使用指定的模型和提供商", async () => {
      // 准备
      const topicId = "1";
      const modelId = "custom-model";
      const providerId = "custom-provider";
      const aiResponse = "这是自定义模型的回复";

      const customProvider: AiModelProvider = {
        ...mockProvider,
        id: providerId,
        name: "Custom Provider",
      };

      const customModel: AiModel = {
        ...mockModel,
        id: modelId,
        name: "Custom Model",
        providerId,
      };

      const initialMessage: Message = {
        id: "3",
        topicId,
        role: "assistant",
        content: "正在生成回复...",
        timestamp: "2023-01-01T00:00:00.000Z",
        modelId,
        providerId,
      };

      const updatedMessage: Message = {
        ...initialMessage,
        content: aiResponse,
      };

      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      mockMessageRepository.findByTopicId.mockResolvedValue(mockMessages);
      mockAiModelService.getProvider.mockResolvedValue(customProvider);
      mockAiModelService.getModel.mockResolvedValue(customModel);
      mockMessageRepository.create.mockResolvedValue(initialMessage);
      mockMessageRepository.update.mockResolvedValue(updatedMessage);
      mockTopicRepository.incrementMessageCount.mockResolvedValue();
      mockTopicRepository.update.mockResolvedValue({
        ...mockTopic,
        lastModelId: modelId,
        lastProviderId: providerId,
        updatedAt: "2023-01-01T00:00:00.000Z",
      });
      mockTopicRepository.updatePreview.mockResolvedValue();

      // 模拟 fetch 响应
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: aiResponse,
              },
            },
          ],
        }),
      });

      const onEvent = jest.fn();

      // 执行
      const result = await chatService.generateAiReplyStream(
        topicId,
        onEvent,
        modelId,
        providerId
      );

      // 验证
      expect(mockAiModelService.getProvider).toHaveBeenCalledWith(providerId);
      expect(mockAiModelService.getModel).toHaveBeenCalledWith(modelId);
      expect(mockAiModelService.getCurrentModel).not.toHaveBeenCalled();
      expect(result).toEqual(updatedMessage);
    });
  });
});
