/**
 * 聊天服务消息管理方法的单元测试
 */
import { ChatService } from "../ChatService";
import { Topic, Message } from "../../../models/chat";
import {
  ITopicRepository,
  IMessageRepository,
  IAssistantRepository,
} from "../../../repositories/interfaces";
import { IAiModelService, IMcpToolService } from "../../interfaces";

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
  {
    id: "3",
    topicId: "1",
    role: "system",
    content: "这是一条系统消息",
    timestamp: "2023-01-01T00:00:02.000Z",
    modelId: undefined,
    providerId: undefined,
  },
];

describe("ChatService - 消息管理", () => {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getMessages", () => {
    it("应该返回话题下的所有消息并按时间戳排序", async () => {
      // 准备
      const topicId = "1";
      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      mockMessageRepository.findByTopicId.mockResolvedValue(
        [...mockMessages].reverse()
      ); // 故意反序

      // 执行
      const result = await chatService.getMessages(topicId);

      // 验证
      expect(mockTopicRepository.findById).toHaveBeenCalledWith(topicId);
      expect(mockMessageRepository.findByTopicId).toHaveBeenCalledWith(topicId);
      expect(result).toEqual(mockMessages); // 应该按时间戳排序
    });

    it("应该在话题不存在时抛出错误", async () => {
      // 准备
      const topicId = "nonexistent";
      mockTopicRepository.findById.mockResolvedValue(null);

      // 执行和验证
      await expect(chatService.getMessages(topicId)).rejects.toThrow(
        "获取话题消息失败: 话题不存在: nonexistent"
      );
    });

    it("应该处理获取消息时的错误", async () => {
      // 准备
      const topicId = "1";
      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      const error = new Error("数据库错误");
      mockMessageRepository.findByTopicId.mockRejectedValue(error);

      // 执行和验证
      await expect(chatService.getMessages(topicId)).rejects.toThrow(
        "获取话题消息失败: 数据库错误"
      );
    });
  });

  describe("sendMessage", () => {
    it("应该成功发送用户消息", async () => {
      // 准备
      const topicId = "1";
      const content = "这是一条测试消息";
      const expectedMessage: Message = {
        id: "123",
        topicId,
        role: "user",
        content,
        timestamp: "2023-01-01T00:00:00.000Z",
      };

      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      mockMessageRepository.create.mockResolvedValue(expectedMessage);
      mockTopicRepository.incrementMessageCount.mockResolvedValue();
      mockTopicRepository.updatePreview.mockResolvedValue();

      // 执行
      const result = await chatService.sendMessage(topicId, content);

      // 验证
      expect(mockTopicRepository.findById).toHaveBeenCalledWith(topicId);
      expect(mockMessageRepository.create).toHaveBeenCalledWith({
        topicId,
        role: "user",
        content,
        timestamp: "2023-01-01T00:00:00.000Z",
      });
      expect(mockTopicRepository.incrementMessageCount).toHaveBeenCalledWith(
        topicId
      );
      expect(mockTopicRepository.updatePreview).toHaveBeenCalledWith(
        topicId,
        content
      );
      expect(result).toEqual(expectedMessage);
    });

    it("应该在话题不存在时抛出错误", async () => {
      // 准备
      const topicId = "nonexistent";
      const content = "这是一条测试消息";
      mockTopicRepository.findById.mockResolvedValue(null);

      // 执行和验证
      await expect(chatService.sendMessage(topicId, content)).rejects.toThrow(
        "发送用户消息失败: 话题不存在: nonexistent"
      );
    });

    it("应该处理发送消息时的错误", async () => {
      // 准备
      const topicId = "1";
      const content = "这是一条测试消息";
      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      const error = new Error("数据库错误");
      mockMessageRepository.create.mockRejectedValue(error);

      // 执行和验证
      await expect(chatService.sendMessage(topicId, content)).rejects.toThrow(
        "发送用户消息失败: 数据库错误"
      );
    });
  });

  describe("sendSystemMessage", () => {
    it("应该成功发送系统消息", async () => {
      // 准备
      const topicId = "1";
      const content = "这是一条系统消息";
      const expectedMessage: Message = {
        id: "123",
        topicId,
        role: "system",
        content,
        timestamp: "2023-01-01T00:00:00.000Z",
      };

      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      mockMessageRepository.create.mockResolvedValue(expectedMessage);
      mockTopicRepository.incrementMessageCount.mockResolvedValue();

      // 执行
      const result = await chatService.sendSystemMessage(topicId, content);

      // 验证
      expect(mockTopicRepository.findById).toHaveBeenCalledWith(topicId);
      expect(mockMessageRepository.create).toHaveBeenCalledWith({
        topicId,
        role: "system",
        content,
        timestamp: "2023-01-01T00:00:00.000Z",
      });
      expect(mockTopicRepository.incrementMessageCount).toHaveBeenCalledWith(
        topicId
      );
      expect(mockTopicRepository.updatePreview).not.toHaveBeenCalled(); // 系统消息不更新预览
      expect(result).toEqual(expectedMessage);
    });

    it("应该在话题不存在时抛出错误", async () => {
      // 准备
      const topicId = "nonexistent";
      const content = "这是一条系统消息";
      mockTopicRepository.findById.mockResolvedValue(null);

      // 执行和验证
      await expect(
        chatService.sendSystemMessage(topicId, content)
      ).rejects.toThrow("发送系统消息失败: 话题不存在: nonexistent");
    });

    it("应该处理发送系统消息时的错误", async () => {
      // 准备
      const topicId = "1";
      const content = "这是一条系统消息";
      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      const error = new Error("数据库错误");
      mockMessageRepository.create.mockRejectedValue(error);

      // 执行和验证
      await expect(
        chatService.sendSystemMessage(topicId, content)
      ).rejects.toThrow("发送系统消息失败: 数据库错误");
    });
  });

  describe("deleteMessage", () => {
    it("应该成功删除消息并更新话题", async () => {
      // 准备
      const messageId = "1";
      mockMessageRepository.findById.mockResolvedValue(mockMessages[0]);
      mockTopicRepository.findById.mockResolvedValue(mockTopic);
      mockMessageRepository.findByTopicId.mockResolvedValue([
        mockMessages[1],
        mockMessages[2],
      ]);

      // 执行
      await chatService.deleteMessage(messageId);

      // 验证
      expect(mockMessageRepository.findById).toHaveBeenCalledWith(messageId);
      expect(mockMessageRepository.delete).toHaveBeenCalledWith(messageId);
      expect(mockTopicRepository.update).toHaveBeenCalledWith("1", {
        messageCount: 2,
        updatedAt: "2023-01-01T00:00:00.000Z",
      });
      expect(mockTopicRepository.updatePreview).toHaveBeenCalledWith(
        "1",
        "你好，有什么可以帮助你的？"
      );
    });

    it("应该在消息不存在时抛出错误", async () => {
      // 准备
      const messageId = "nonexistent";
      mockMessageRepository.findById.mockResolvedValue(null);

      // 执行和验证
      await expect(chatService.deleteMessage(messageId)).rejects.toThrow(
        "删除消息失败: 消息不存在: nonexistent"
      );
    });

    it("应该处理删除消息时的错误", async () => {
      // 准备
      const messageId = "1";
      mockMessageRepository.findById.mockResolvedValue(mockMessages[0]);
      const error = new Error("数据库错误");
      mockMessageRepository.delete.mockRejectedValue(error);

      // 执行和验证
      await expect(chatService.deleteMessage(messageId)).rejects.toThrow(
        "删除消息失败: 数据库错误"
      );
    });

    it("应该处理删除最后一条消息的情况", async () => {
      // 准备
      const messageId = "1";
      mockMessageRepository.findById.mockResolvedValue(mockMessages[0]);
      mockTopicRepository.findById.mockResolvedValue({
        ...mockTopic,
        messageCount: 1,
      });
      mockMessageRepository.findByTopicId.mockResolvedValue([]);
      mockMessageRepository.delete.mockResolvedValue();

      // 执行
      await chatService.deleteMessage(messageId);

      // 验证
      expect(mockTopicRepository.updatePreview).toHaveBeenCalledWith("1", "");
    });
  });
});
