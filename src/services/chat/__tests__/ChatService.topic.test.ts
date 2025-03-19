/**
 * 聊天服务话题管理方法的单元测试
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
const mockTopics: Topic[] = [
  {
    id: "1",
    title: "测试话题1",
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-01-01T00:00:00.000Z",
    messageCount: 5,
    preview: "这是一个测试话题",
  },
  {
    id: "2",
    title: "测试话题2",
    createdAt: "2023-01-02T00:00:00.000Z",
    updatedAt: "2023-01-02T00:00:00.000Z",
    messageCount: 3,
    preview: "这是另一个测试话题",
  },
];

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

describe("ChatService - 话题管理", () => {
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

  describe("createTopic", () => {
    it("应该成功创建话题", async () => {
      // 准备
      const title = "新话题";
      const expectedTopic: Topic = {
        id: "123",
        title,
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
        messageCount: 0,
      };

      mockTopicRepository.create.mockResolvedValue(expectedTopic);

      // 执行
      const result = await chatService.createTopic(title);

      // 验证
      expect(mockTopicRepository.create).toHaveBeenCalledWith({
        title,
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
        messageCount: 0,
      });
      expect(result).toEqual(expectedTopic);
    });

    it("应该处理创建话题时的错误", async () => {
      // 准备
      const title = "新话题";
      const error = new Error("数据库错误");

      mockTopicRepository.create.mockRejectedValue(error);

      // 执行和验证
      await expect(chatService.createTopic(title)).rejects.toThrow(
        "创建话题失败: 数据库错误"
      );
    });
  });

  describe("getAllTopics", () => {
    it("应该返回所有话题", async () => {
      // 准备
      mockTopicRepository.findAll.mockResolvedValue(mockTopics);

      // 执行
      const result = await chatService.getAllTopics();

      // 验证
      expect(mockTopicRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockTopics);
    });

    it("应该返回限制数量的最近话题", async () => {
      // 准备
      const limit = 5;
      mockTopicRepository.findRecent.mockResolvedValue(mockTopics);

      // 执行
      const result = await chatService.getAllTopics(limit);

      // 验证
      expect(mockTopicRepository.findRecent).toHaveBeenCalledWith(limit);
      expect(result).toEqual(mockTopics);
    });

    it("应该应用偏移量", async () => {
      // 准备
      const limit = 5;
      const offset = 1;
      mockTopicRepository.findRecent.mockResolvedValue(mockTopics);

      // 执行
      const result = await chatService.getAllTopics(limit, offset);

      // 验证
      expect(mockTopicRepository.findRecent).toHaveBeenCalledWith(limit);
      expect(result).toEqual(mockTopics.slice(offset));
    });

    it("应该处理获取话题列表时的错误", async () => {
      // 准备
      const error = new Error("数据库错误");
      mockTopicRepository.findAll.mockRejectedValue(error);

      // 执行和验证
      await expect(chatService.getAllTopics()).rejects.toThrow(
        "获取话题列表失败: 数据库错误"
      );
    });
  });

  describe("getTopic", () => {
    it("应该返回指定ID的话题", async () => {
      // 准备
      const topicId = "1";
      mockTopicRepository.findById.mockResolvedValue(mockTopics[0]);

      // 执行
      const result = await chatService.getTopic(topicId);

      // 验证
      expect(mockTopicRepository.findById).toHaveBeenCalledWith(topicId);
      expect(result).toEqual(mockTopics[0]);
    });

    it("应该返回null如果话题不存在", async () => {
      // 准备
      const topicId = "nonexistent";
      mockTopicRepository.findById.mockResolvedValue(null);

      // 执行
      const result = await chatService.getTopic(topicId);

      // 验证
      expect(mockTopicRepository.findById).toHaveBeenCalledWith(topicId);
      expect(result).toBeNull();
    });

    it("应该处理获取话题详情时的错误", async () => {
      // 准备
      const topicId = "1";
      const error = new Error("数据库错误");
      mockTopicRepository.findById.mockRejectedValue(error);

      // 执行和验证
      await expect(chatService.getTopic(topicId)).rejects.toThrow(
        "获取话题详情失败: 数据库错误"
      );
    });
  });

  describe("searchTopics", () => {
    it("应该返回匹配查询的话题", async () => {
      // 准备
      const query = "测试";
      mockTopicRepository.findByTitle.mockResolvedValue(mockTopics);

      // 执行
      const result = await chatService.searchTopics(query);

      // 验证
      expect(mockTopicRepository.findByTitle).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockTopics);
    });

    it("应该返回空数组如果没有匹配的话题", async () => {
      // 准备
      const query = "不存在";
      mockTopicRepository.findByTitle.mockResolvedValue([]);

      // 执行
      const result = await chatService.searchTopics(query);

      // 验证
      expect(mockTopicRepository.findByTitle).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });

    it("应该处理搜索话题时的错误", async () => {
      // 准备
      const query = "测试";
      const error = new Error("数据库错误");
      mockTopicRepository.findByTitle.mockRejectedValue(error);

      // 执行和验证
      await expect(chatService.searchTopics(query)).rejects.toThrow(
        "搜索话题失败: 数据库错误"
      );
    });
  });

  describe("updateTopic", () => {
    it("应该成功更新话题", async () => {
      // 准备
      const topicId = "1";
      const updateData: Partial<Topic> = {
        title: "更新后的标题",
      };
      const updatedTopic: Topic = {
        ...mockTopics[0],
        title: "更新后的标题",
        updatedAt: "2023-01-01T00:00:00.000Z",
      };

      mockTopicRepository.update.mockResolvedValue(updatedTopic);

      // 执行
      const result = await chatService.updateTopic(topicId, updateData);

      // 验证
      expect(mockTopicRepository.update).toHaveBeenCalledWith(topicId, {
        ...updateData,
        updatedAt: "2023-01-01T00:00:00.000Z",
      });
      expect(result).toEqual(updatedTopic);
    });

    it("应该处理更新话题时的错误", async () => {
      // 准备
      const topicId = "1";
      const updateData: Partial<Topic> = {
        title: "更新后的标题",
      };
      const error = new Error("数据库错误");

      mockTopicRepository.update.mockRejectedValue(error);

      // 执行和验证
      await expect(
        chatService.updateTopic(topicId, updateData)
      ).rejects.toThrow("更新话题失败: 数据库错误");
    });
  });

  describe("deleteTopic", () => {
    it("应该成功删除话题及其消息", async () => {
      // 准备
      const topicId = "1";
      mockMessageRepository.findByTopicId.mockResolvedValue(mockMessages);
      mockTopicRepository.delete.mockResolvedValue(true);

      // 对每条消息设置删除模拟
      for (const message of mockMessages) {
        mockMessageRepository.delete.mockResolvedValueOnce();
      }

      // 执行
      await chatService.deleteTopic(topicId);

      // 验证
      expect(mockMessageRepository.findByTopicId).toHaveBeenCalledWith(topicId);
      expect(mockMessageRepository.delete).toHaveBeenCalledTimes(
        mockMessages.length
      );
      expect(mockTopicRepository.delete).toHaveBeenCalledWith(topicId);
    });

    it("应该处理删除话题时的错误", async () => {
      // 准备
      const topicId = "1";
      const error = new Error("数据库错误");
      mockMessageRepository.findByTopicId.mockResolvedValue(mockMessages);
      mockTopicRepository.delete.mockRejectedValue(error);

      // 对每条消息设置删除模拟
      mockMessages.forEach(() => {
        mockMessageRepository.delete.mockResolvedValueOnce();
      });

      // 执行和验证
      await expect(chatService.deleteTopic(topicId)).rejects.toThrow(
        "删除话题失败: 数据库错误"
      );
    });

    it("应该处理获取消息失败的情况", async () => {
      // 准备
      const topicId = "1";
      const error = new Error("数据库错误");
      mockMessageRepository.findByTopicId.mockRejectedValue(error);

      // 执行和验证
      await expect(chatService.deleteTopic(topicId)).rejects.toThrow(
        "删除话题失败: 数据库错误"
      );
    });
  });

  describe("getTopicStats", () => {
    it("应该返回正确的话题统计信息", async () => {
      // 准备
      mockTopicRepository.findAll.mockResolvedValue([
        {
          ...mockTopics[0],
          createdAt: "2023-01-01T00:00:00.000Z", // 今天创建的
        },
        {
          ...mockTopics[1],
          createdAt: "2022-12-31T00:00:00.000Z", // 昨天创建的
        },
      ]);

      // 执行
      const result = await chatService.getTopicStats();

      // 验证
      expect(mockTopicRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        total: 2,
        today: 1,
      });
    });

    it("应该处理获取统计信息时的错误", async () => {
      // 准备
      const error = new Error("数据库错误");
      mockTopicRepository.findAll.mockRejectedValue(error);

      // 执行和验证
      await expect(chatService.getTopicStats()).rejects.toThrow(
        "获取话题统计信息失败: 数据库错误"
      );
    });

    it("应该处理空话题列表", async () => {
      // 准备
      mockTopicRepository.findAll.mockResolvedValue([]);

      // 执行
      const result = await chatService.getTopicStats();

      // 验证
      expect(result).toEqual({
        total: 0,
        today: 0,
      });
    });
  });
});
