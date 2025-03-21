/**
 * 聊天服务实现
 * 负责管理聊天话题和消息
 */
import { IChatService, IMcpToolService } from "../interfaces";
import {
  ITopicRepository,
  IMessageRepository,
} from "../../repositories/interfaces";
import { IAiModelService } from "../interfaces";
import {
  Topic,
  Message,
  AiModel,
  AiModelProvider,
  Assistant,
} from "../../models/chat";
import { IAssistantRepository } from "../../repositories/interfaces";
import { McpToolHandler, IMcpTool } from "./mcpToolHandler";
import { ModelAdapterFactory, IModelAdapter } from "./modelAdapters";
import {
  StreamEventType,
  StreamEvent,
  StreamEventFactory,
} from "./StreamEventHandler";
import {
  ToolCallContext,
  ToolCallState,
  ToolCallRecord,
} from "./ToolCallContext";
import { finished } from "stream";
import { de } from "date-fns/locale";
import { time } from "console";
// 导入新类
import { ModelResponseContext } from "./ModelResponseContext";
import { MessageStatus } from "@/models/messageStatus";
import {
  readStreamChunks,
  splitIntoLines,
  extractDataChunks,
} from "./utils/streamUtils";
import { buildRequestUrl } from "./utils/modelUtils";

/**
 * 扩展 AiModel 类型，添加工具支持
 */
interface AiModelWithTools extends AiModel {
  /**
   * 是否启用工具
   */
  toolsEnabled?: boolean;
}

/**
 * 聊天服务类
 * 实现IChatService接口
 */
export class ChatService implements IChatService {
  /**
   * MCP工具处理器
   * @private
   */
  private mcpToolHandler: McpToolHandler;

  /**
   * 当前会话的工具调用上下文
   * @private
   */
  private toolCallContext: ToolCallContext | null = null;

  // 添加响应上下文管理
  private modelResponseContexts: Map<string, ModelResponseContext> = new Map();

  /**
   * 构造函数
   * @param topicRepository 话题存储库
   * @param messageRepository 消息存储库
   * @param aiModelService AI模型服务
   * @param assistantRepository 助手存储库
   * @param mcpToolService MCP工具服务
   */
  constructor(
    private topicRepository: ITopicRepository,
    private messageRepository: IMessageRepository,
    private aiModelService: IAiModelService,
    private assistantRepository: IAssistantRepository,
    private mcpToolService: IMcpToolService
  ) {
    // 创建MCP工具处理器
    this.mcpToolHandler = new McpToolHandler(mcpToolService);
  }

  /**
   * 获取模型适配器
   * @param providerName 提供商名称
   * @returns 模型适配器
   * @private
   */
  private getModelAdapter(providerName: string): IModelAdapter {
    console.log(`获取模型适配器: 提供商=${providerName}`);
    const adapter = ModelAdapterFactory.createAdapter(providerName);
    console.log(`已获取模型适配器: ${adapter.getProviderName()}`);
    return adapter;
  }

  /**
   * 初始化聊天服务
   */
  async initialize(): Promise<void> {
    console.log("初始化聊天服务...");

    try {
      // 检查是否有任何助手
      const assistants = await this.assistantRepository.findAll();

      if (assistants.length === 0) {
        console.log("数据库中没有助手，创建初始助手...");

        // 获取可用的模型和提供商
        const providers = await this.aiModelService.getAllProviders();
        const ollamaProvider = providers.find((p) => p.id === "ollama");

        // 获取系统默认模型和提供商
        const defaultModel = await this.aiModelService.getDefaultModel();
        const defaultProvider = defaultModel?.provider;
        const defaultModelId = defaultModel?.model.id;

        // 创建默认助手
        if (defaultProvider && defaultModelId) {
          await this.createDefaultAssistant(defaultProvider.id, defaultModelId);
        } else if (ollamaProvider) {
          // 如果没有默认模型但有Ollama提供商，使用Ollama的模型
          const ollamaModels = await this.aiModelService.getModelsByProvider(
            ollamaProvider.id
          );
          if (ollamaModels.length > 0) {
            await this.createDefaultAssistant(
              ollamaProvider.id,
              ollamaModels[0].id
            );
          }
        } else if (providers.length > 0) {
          // 如果没有默认模型和Ollama，使用第一个提供商的第一个模型
          const firstProvider = providers[0];
          const models = await this.aiModelService.getModelsByProvider(
            firstProvider.id
          );
          if (models.length > 0) {
            await this.createDefaultAssistant(firstProvider.id, models[0].id);
          }
        }
      }

      // 初始化 MCP 工具处理器
      console.log("初始化 MCP 工具处理器...");

      // 这里可以添加其他初始化逻辑，如预加载工具列表等

      console.log("聊天服务初始化完成");
    } catch (error) {
      console.error("初始化聊天服务失败:", error);
      throw error;
    }
  }

  /**
   * 释放聊天服务资源
   */
  async dispose(): Promise<void> {
    console.log("释放聊天服务资源...");

    // 这里可以添加资源释放逻辑，例如：
    // - 保存缓存
    // - 关闭连接

    console.log("聊天服务资源释放完成");
  }

  /**
   * 创建新话题
   * @param title 话题标题
   * @returns 创建的话题
   */
  async createTopic(title: string): Promise<Topic> {
    try {
      // 创建新话题
      const now = new Date().toISOString();
      const newTopic: Omit<Topic, "id"> = {
        title,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      };

      // 使用存储库创建话题
      const topic = await this.topicRepository.create(newTopic);
      console.log(`创建新话题: ${topic.id}, 标题: ${topic.title}`);

      return topic;
    } catch (error) {
      console.error("创建话题失败:", error);
      throw new Error(
        `创建话题失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 获取所有话题
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 话题列表
   */
  async getAllTopics(limit?: number, offset?: number): Promise<Topic[]> {
    try {
      // 如果提供了limit参数，使用findRecent方法
      if (limit !== undefined) {
        const topics = await this.topicRepository.findRecent(limit);

        // 如果提供了offset参数，应用偏移
        if (offset !== undefined && offset > 0) {
          return topics.slice(offset);
        }

        return topics;
      }

      // 否则获取所有话题
      return await this.topicRepository.findAll();
    } catch (error) {
      console.error("获取话题列表失败:", error);
      throw new Error(
        `获取话题列表失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 获取话题详情
   * @param id 话题ID
   * @returns 话题详情或null（如果不存在）
   */
  async getTopic(id: string): Promise<Topic | null> {
    try {
      return await this.topicRepository.findById(id);
    } catch (error) {
      console.error(`获取话题详情失败 (ID: ${id}):`, error);
      throw new Error(
        `获取话题详情失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 搜索话题
   * @param query 搜索关键词
   * @returns 匹配的话题列表
   */
  async searchTopics(query: string): Promise<Topic[]> {
    try {
      // 使用存储库的findByTitle方法搜索话题
      return await this.topicRepository.findByTitle(query);
    } catch (error) {
      console.error(`搜索话题失败 (查询: ${query}):`, error);
      throw new Error(
        `搜索话题失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 更新话题
   * @param id 话题ID
   * @param data 要更新的字段
   * @returns 更新后的话题
   */
  async updateTopic(id: string, data: Partial<Topic>): Promise<Topic> {
    try {
      // 确保更新时间字段
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      // 使用存储库更新话题
      const updatedTopic = await this.topicRepository.update(id, updateData);
      console.log(`更新话题: ${id}`);

      return updatedTopic;
    } catch (error) {
      console.error(`更新话题失败 (ID: ${id}):`, error);
      throw new Error(
        `更新话题失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 删除话题
   * @param id 话题ID
   */
  async deleteTopic(id: string): Promise<void> {
    try {
      // 检查话题是否存在
      const topic = await this.topicRepository.findById(id);
      if (!topic) {
        console.warn(`尝试删除不存在的话题: ${id}`);
        throw new Error(`话题不存在: ${id}`);
      }

      console.log(`开始删除话题: ${id}, 标题: ${topic.title}`);

      // 首先删除话题下的所有消息
      try {
        const messages = await this.messageRepository.findByTopicId(id);
        console.log(`话题 ${id} 有 ${messages.length} 条消息需要删除`);

        for (const message of messages) {
          try {
            await this.messageRepository.delete(message.id);
          } catch (msgError) {
            console.error(`删除消息失败 (ID: ${message.id}):`, msgError);
            // 继续删除其他消息
          }
        }
      } catch (messagesError) {
        console.error(`获取话题消息失败 (ID: ${id}):`, messagesError);
        // 继续尝试删除话题
      }

      // 然后删除话题
      const result = await this.topicRepository.delete(id);
      if (!result) {
        console.warn(`话题删除操作未影响任何行: ${id}`);
      }

      console.log(`删除话题完成: ${id}`);
    } catch (error) {
      console.error(`删除话题失败 (ID: ${id}):`, error);
      throw new Error(
        `删除话题失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 获取话题消息
   * @param topicId 话题ID
   * @returns 消息列表
   */
  async getMessages(topicId: string): Promise<Message[]> {
    try {
      // 检查话题是否存在
      const topic = await this.topicRepository.findById(topicId);
      if (!topic) {
        throw new Error(`话题不存在: ${topicId}`);
      }

      // 获取话题下的所有消息
      const messages = await this.messageRepository.findByTopicId(topicId);

      // 按时间戳排序
      return messages.sort((a, b) => {
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    } catch (error) {
      console.error(`获取话题消息失败 (话题ID: ${topicId}):`, error);
      throw new Error(
        `获取话题消息失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 发送用户消息
   * @param topicId 话题ID
   * @param content 消息内容
   * @returns 创建的消息
   */
  async sendMessage(topicId: string, content: string): Promise<Message> {
    try {
      // 检查话题是否存在
      const topic = await this.topicRepository.findById(topicId);
      if (!topic) {
        throw new Error(`话题不存在: ${topicId}`);
      }

      // 创建新消息
      const now = new Date().toISOString();
      const newMessage: Omit<Message, "id"> = {
        topicId,
        role: "user",
        content,
        timestamp: now,
      };

      // 保存消息
      const message = await this.messageRepository.create(newMessage);

      // 更新话题的消息计数和预览
      await this.topicRepository.incrementMessageCount(topicId);
      await this.topicRepository.updatePreview(topicId, content);

      console.log(`发送用户消息: ${message.id}, 话题: ${topicId}`);
      return message;
    } catch (error) {
      console.error(`发送用户消息失败 (话题ID: ${topicId}):`, error);
      throw new Error(
        `发送用户消息失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 发送系统消息
   * @param topicId 话题ID
   * @param content 消息内容
   * @returns 创建的消息
   */
  async sendSystemMessage(topicId: string, content: string): Promise<Message> {
    try {
      // 检查话题是否存在
      const topic = await this.topicRepository.findById(topicId);
      if (!topic) {
        throw new Error(`话题不存在: ${topicId}`);
      }

      // 创建新消息
      const now = new Date().toISOString();
      const newMessage: Omit<Message, "id"> = {
        topicId,
        role: "system",
        content,
        timestamp: now,
      };

      // 保存消息
      const message = await this.messageRepository.create(newMessage);

      // 更新话题的消息计数（系统消息也计入总数）
      await this.topicRepository.incrementMessageCount(topicId);

      console.log(`发送系统消息: ${message.id}, 话题: ${topicId}`);
      return message;
    } catch (error) {
      console.error(`发送系统消息失败 (话题ID: ${topicId}):`, error);
      throw new Error(
        `发送系统消息失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 删除消息
   * @param id 消息ID
   */
  async deleteMessage(id: string): Promise<void> {
    try {
      // 获取消息详情
      const message = await this.messageRepository.findById(id);
      if (!message) {
        throw new Error(`消息不存在: ${id}`);
      }

      // 删除消息
      await this.messageRepository.delete(id);

      // 如果话题存在，减少话题的消息计数
      const topic = await this.topicRepository.findById(message.topicId);
      if (topic) {
        // 更新话题
        await this.topicRepository.update(message.topicId, {
          messageCount: Math.max(0, topic.messageCount - 1),
          updatedAt: new Date().toISOString(),
        });

        // 如果删除的是最后一条消息，更新预览为前一条消息的内容
        if (topic.messageCount === 1) {
          await this.topicRepository.updatePreview(message.topicId, "");
        } else {
          const messages = await this.messageRepository.findByTopicId(
            message.topicId
          );
          if (messages.length > 0) {
            // 找到最新的非系统消息作为预览
            const previewMessage = messages
              .filter((m) => m.role !== "system")
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              )[0];

            if (previewMessage) {
              await this.topicRepository.updatePreview(
                message.topicId,
                previewMessage.content
              );
            }
          }
        }
      }

      console.log(`删除消息: ${id}`);
    } catch (error) {
      console.error(`删除消息失败 (ID: ${id}):`, error);
      throw new Error(
        `删除消息失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 获取话题统计信息
   * @returns 话题总数和今日新增数
   */
  async getTopicStats(): Promise<{ total: number; today: number }> {
    try {
      console.log("获取话题统计信息...");

      // 获取所有话题
      const allTopics = await this.topicRepository.findAll();
      console.log(`获取到 ${allTopics.length} 个话题`);

      // 计算总数
      const total = allTopics.length;

      // 计算今日新增数
      const today = new Date().toISOString().split("T")[0]; // 获取当前日期（YYYY-MM-DD）
      console.log(`当前日期: ${today}`);

      const todayTopics = allTopics.filter((topic) => {
        if (!topic.createdAt) {
          console.log(`警告: 话题 ${topic.id} 没有 createdAt 字段`);
          return false;
        }

        const topicDate = topic.createdAt.toString().split("T")[0];
        const isToday = topicDate === today;
        console.log(
          `话题 ${topic.id} 创建日期: ${topicDate}, 是否今天: ${isToday}`
        );
        return isToday;
      });

      const result = {
        total,
        today: todayTopics.length,
      };

      console.log(`话题统计结果: 总数=${total}, 今日=${todayTopics.length}`);
      return result;
    } catch (error) {
      console.error("获取话题统计信息失败:", error);
      // 返回默认值，而不是抛出错误
      return {
        total: 0,
        today: 0,
      };
    }
  }

  /**
   * 生成AI回复（流式响应）
   * @param topicId 话题ID
   * @param onEvent 接收流事件的回调函数
   * @param modelId 模型ID（可选）
   * @param providerId 提供商ID（可选）
   * @returns 生成的回复消息
   */
  async generateAiReplyStream(
    topicId: string,
    onEvent: (event: StreamEvent) => void,
    modelId?: string,
    providerId?: string
  ): Promise<Message> {
    const { topic, sortedMessages } = await this.validateAndPrepareMessages(
      topicId
    );

    const currentModel = await this.determineModel(topic, modelId, providerId);

    // 创建初始助手消息
    const message = await this.createInitialAssistantMessage(
      topicId,
      currentModel
    );

    // 初始化工具调用上下文（保持不变）
    this.toolCallContext = new ToolCallContext(message.id);

    // 创建并保存模型响应上下文
    const responseContext = new ModelResponseContext(message.id);
    this.modelResponseContexts.set(message.id, responseContext);

    // 记录初始信息
    responseContext.setMetadata("message", message);
    responseContext.setMetadata("topicId", topicId);
    responseContext.setMetadata("messageId", message.id);
    responseContext.setMetadata("name", currentModel.model.name);
    responseContext.setMetadata("providerId", currentModel.provider.id);
    responseContext.setMetadata(
      "generationStartTime",
      new Date().toISOString()
    );

    try {
      const { modelAdapter, requestMessages, headers, tools } =
        await this.prepareRequestData(currentModel, sortedMessages, topic);

      // 将响应上下文传递给handleStreamResponse
      const { fullContent, toolResultSummary } =
        await this.handleStreamResponse(
          currentModel,
          modelAdapter,
          requestMessages,
          headers,
          tools,
          onEvent,
          responseContext // 新增参数
        );

      // 消息生成完成后更新
      // responseContext.updateFullContent(fullContent);
      responseContext.updateToolResultSummary(toolResultSummary);
      responseContext.setMetadata(
        "generationEndTime",
        new Date().toISOString()
      );
      responseContext.setMetadata("completed", true);

      // 将响应上下文传递给updateMessageAndTopic
      const updatedMessage = await this.updateMessageAndTopic(
        message,
        responseContext.getFullContent(),
        toolResultSummary,
        topicId,
        currentModel,
        responseContext // 新增参数
      );
      console.log("更新消息完成", message.id, new Date().toISOString());

      return updatedMessage;
    } catch (error) {
      // 记录错误信息
      responseContext.setMetadata("error", error || String(error));
      responseContext.setMetadata("errorTime", new Date().toISOString());
      responseContext.setMetadata("failed", true);

      // 处理错误时也传递响应上下文
      return await this.handleStreamError(
        message,
        error,
        topicId,
        responseContext // 新增参数
      );
    } finally {
      this.toolCallContext = null;
    }
  }

  /**
   * 中止当前生成过程
   * @param topicId 话题ID
   * @param onEvent 事件回调函数
   */
  public abortCurrentGeneration(
    topicId: string,
    onEvent: (event: StreamEvent) => void
  ): void {
    if (this.toolCallContext) {
      console.log(`中止AI生成过程: 话题ID=${topicId}`);

      // 1. 中止当前正在进行的工具调用
      this.toolCallContext.abort();

      // 2. 发送 ABORT 事件
      onEvent(
        StreamEventFactory.createControlEvent(
          StreamEventType.ABORT,
          this.toolCallContext.getMessageId(),
          "用户主动中止"
        )
      );

      // 3. 清理上下文
      this.toolCallContext.clear();

      // 4. 发送会话结束事件
      onEvent(StreamEventFactory.createSessionEnd(topicId));
    }

    // 查找当前的响应上下文并记录中止信息
    if (this.toolCallContext) {
      const messageId = this.toolCallContext.getMessageId();
      const responseContext = this.modelResponseContexts.get(messageId);

      if (responseContext) {
        responseContext.setMetadata("aborted", true);
        responseContext.setMetadata("abortTime", new Date().toISOString());
        responseContext.setMetadata("abortReason", "user_requested");
      }
    }
  }

  /**
   * 验证话题并准备消息
   * @param topicId 话题ID
   * @returns 话题和排序后的消息
   * @private
   */
  private async validateAndPrepareMessages(topicId: string): Promise<{
    topic: Topic;
    sortedMessages: Message[];
  }> {
    // 检查话题是否存在
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new Error(`话题不存在: ${topicId}`);
    }

    // 获取话题下的所有消息
    const messages = await this.messageRepository.findByTopicId(topicId);
    if (messages.length === 0) {
      throw new Error("话题没有消息，无法生成回复");
    }

    // 按时间戳排序
    const sortedMessages = messages.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    console.log(`话题消息数量: ${sortedMessages.length}`);

    return { topic, sortedMessages };
  }

  /**
   * 确定使用的模型和提供商
   * @param topic 话题
   * @param modelId 模型ID
   * @param providerId 提供商ID
   * @returns 当前模型信息
   * @private
   */
  private async determineModel(
    topic: Topic,
    modelId?: string,
    providerId?: string
  ): Promise<{ provider: AiModelProvider; model: AiModel }> {
    let currentModel: { provider: AiModelProvider; model: AiModel };

    if (modelId && providerId) {
      // 使用指定的模型和提供商
      const provider = await this.aiModelService.getProvider(providerId);
      const model = await this.aiModelService.getModel(modelId);

      if (!provider || !model) {
        throw new Error("指定的模型或提供商不存在");
      }

      currentModel = { provider, model };
    } else if (
      topic.currentConfig?.providerId &&
      topic.currentConfig?.modelId
    ) {
      // 优先使用话题的 currentConfig 中的模型信息
      console.log(
        `尝试使用话题配置的模型: providerId=${topic.currentConfig.providerId}, modelId=${topic.currentConfig.modelId}`
      );

      const provider = await this.aiModelService.getProvider(
        topic.currentConfig.providerId
      );
      const model = await this.aiModelService.getModel(
        topic.currentConfig.modelId
      );

      if (provider && model && provider.enabled) {
        console.log(
          `使用话题配置的模型: ${model.name}, 提供商: ${provider.name}`
        );
        currentModel = { provider, model };
      } else {
        console.log(`话题配置的模型不可用，使用默认模型`);
        // 如果话题配置的模型不可用，使用默认模型
        const defaultModel = await this.aiModelService.getCurrentModel();
        if (!defaultModel) {
          throw new Error("未设置默认模型");
        }

        currentModel = defaultModel;
      }
    } else {
      // 使用默认模型
      console.log(`话题没有配置模型，使用默认模型`);
      const defaultModel = await this.aiModelService.getCurrentModel();
      if (!defaultModel) {
        throw new Error("未设置默认模型");
      }

      currentModel = defaultModel;
    }

    console.log(
      `使用模型: ${currentModel.model.name}, 提供商: ${currentModel.provider.name}`
    );

    return currentModel;
  }

  /**
   * 创建初始助手消息
   * @param topicId 话题ID
   * @param currentModel 当前模型信息
   * @returns 创建的消息
   * @private
   */
  private async createInitialAssistantMessage(
    topicId: string,
    currentModel: { provider: AiModelProvider; model: AiModel }
  ): Promise<Message> {
    const now = new Date().toISOString();
    const assistantMessage: Omit<Message, "id"> = {
      topicId,
      role: "assistant",
      content: "", // 初始内容为空
      timestamp: now,
      modelId: currentModel.model.id,
      providerId: currentModel.provider.id,
    };

    // 保存初始消息
    const message = await this.messageRepository.create(assistantMessage);
    console.log(`创建初始助手消息: ${message.id}`);

    return message;
  }

  /**
   * 准备请求数据
   * @param currentModel 当前模型信息
   * @param sortedMessages 排序后的消息
   * @param topic 话题
   * @returns 请求所需的数据
   * @private
   */
  private async prepareRequestData(
    currentModel: { provider: AiModelProvider; model: AiModel },
    sortedMessages: Message[],
    topic: Topic
  ): Promise<{
    modelAdapter: IModelAdapter;
    requestMessages: any[];
    headers: Record<string, string>;
    tools: any[];
  }> {
    // 获取模型适配器
    const modelAdapter = this.getModelAdapter(currentModel.provider.name);
    console.log(`使用模型适配器: ${modelAdapter.getProviderName()}`);

    // 准备请求消息
    const requestMessages = modelAdapter.prepareMessages(
      sortedMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      topic.currentConfig?.systemPrompt
    );
    console.log(`准备请求消息数量: ${requestMessages.length}`);

    // 构建请求头
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (currentModel.provider.apiKey) {
      headers["Authorization"] = `Bearer ${currentModel.provider.apiKey}`;
      console.log("已添加API密钥到请求头");
    }

    // 获取可用工具
    const tools = await this.prepareTools(modelAdapter);

    return { modelAdapter, requestMessages, headers, tools };
  }

  /**
   * 准备工具列表
   * @param modelAdapter 模型适配器
   * @returns 工具列表
   * @private
   */
  private async prepareTools(modelAdapter: IModelAdapter): Promise<any[]> {
    const tools: any[] = [];
    // 始终启用工具支持
    const supportsTools = true;
    console.log(`模型是否支持工具调用: ${supportsTools} (已强制设置为 true)`);

    if (supportsTools) {
      console.log("开始获取MCP工具...");
      try {
        // 获取所有可用工具
        console.log("调用 mcpToolHandler.getTools()...");
        const mcpTools = await this.mcpToolHandler.getTools();
        console.log(`获取到 ${mcpTools.length} 个MCP工具`);

        // 检查 mcpToolService 是否可用
        console.log("检查 mcpToolService 是否可用...");
        const allTools = await this.mcpToolService.getAllAvailableTools();
        const configIds = Object.keys(allTools);
        console.log(
          `mcpToolService.getAllAvailableTools 返回了 ${configIds.length} 个配置`
        );
        configIds.forEach((id) => {
          console.log(`配置 ${id} 有 ${allTools[id].length} 个工具`);
        });

        if (mcpTools.length > 0) {
          // 格式化工具列表
          mcpTools.forEach((tool) => {
            console.log(`格式化工具: ${tool.name}, 描述: ${tool.description}`);
            const formattedTool = modelAdapter.formatTool(tool);
            tools.push(formattedTool);
            console.log(`已格式化工具: ${JSON.stringify(formattedTool)}`);
          });

          console.log(`总共格式化了 ${tools.length} 个工具`);
        } else {
          console.log("没有可用的MCP工具，创建一个测试工具");
          // 创建一个测试工具
          const testTool = this.createTestTool();
          console.log(`创建测试工具: ${JSON.stringify(testTool)}`);
          const formattedTestTool = modelAdapter.formatTool(testTool);
          tools.push(formattedTestTool);
          console.log(`已添加测试工具: ${JSON.stringify(formattedTestTool)}`);
        }
      } catch (error) {
        console.error("获取MCP工具时出错:", error);
        // 出错时也创建一个测试工具
        console.log("创建测试工具作为备用");
        const testTool = this.createTestTool();
        const formattedTestTool = modelAdapter.formatTool(testTool);
        tools.push(formattedTestTool);
        console.log(`已添加测试工具: ${JSON.stringify(formattedTestTool)}`);
      }
    }

    return tools;
  }

  /**
   * 创建测试工具
   * @returns 测试工具
   * @private
   */
  private createTestTool(): IMcpTool {
    return {
      name: "test:echo",
      description: "测试工具，回显输入文本",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "要回显的文本",
          },
        },
        required: ["text"],
      },
    };
  }

  /**
   * 处理流式响应
   * @param currentModel 当前模型信息
   * @param modelAdapter 模型适配器
   * @param requestMessages 请求消息
   * @param headers 请求头
   * @param tools 工具列表
   * @param onEvent 接收流事件的回调函数
   * @returns 处理结果
   * @private
   */
  private async handleStreamResponse(
    currentModel: { provider: AiModelProvider; model: AiModel },
    modelAdapter: IModelAdapter,
    requestMessages: any[],
    headers: Record<string, string>,
    tools: any[],
    onEvent: (event: StreamEvent) => void,
    responseContext: ModelResponseContext // 添加参数
  ): Promise<{ fullContent: string; toolResultSummary: string }> {
    responseContext.setMetadata("requestStartTime", new Date().toISOString());

    try {
      // 构建请求
      const url = buildRequestUrl(currentModel.provider, currentModel.model);

      responseContext.setMetadata("requestUrl", url);
      responseContext.setMetadata(
        "modelAdapter",
        modelAdapter.constructor.name
      );
      responseContext.setMetadata("toolsEnabled", tools.length > 0);

      // 记录请求数据（可选，注意敏感信息）
      responseContext.setMetadata("requestHeaders", Object.keys(headers));

      // 执行请求
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(
          modelAdapter.buildRequestBody(requestMessages, responseContext, currentModel.provider, currentModel.model, tools)
        ),
      });

      // 记录响应信息
      responseContext.setMetadata("responseStatus", response.status);
      responseContext.setMetadata("responseStatusText", response.statusText);
      responseContext.setMetadata("responseReceived", new Date().toISOString());

      if (!response.ok) {
        const errorText = await response.text();
        responseContext.setMetadata("errorResponse", errorText);
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      // 处理流式响应，传递响应上下文
      return await this.processStreamResponse(
        response,
        modelAdapter,
        requestMessages,
        currentModel,
        onEvent,
        responseContext // 传递响应上下文
      );
    } catch (error) {
      responseContext.setMetadata("streamError", error || String(error));
      responseContext.setMetadata("streamErrorTime", new Date().toISOString());
      throw error;
    }
  }

  /**
   * 处理AI模型的流式响应数据
   * 负责解析流式数据、处理工具调用、发送事件通知并收集完整内容
   *
   * @param response - 从AI模型获取的原始HTTP响应对象
   * @param modelAdapter - 模型适配器，用于处理不同AI模型的特定格式
   * @param requestMessages - 发送给AI模型的原始请求消息
   * @param currentModel - 当前使用的AI模型信息，包含提供商和模型详情
   * @param onEvent - 回调函数，用于接收流式事件并传递给上层组件
   * @returns 包含完整内容和工具调用结果摘要的对象
   */
  private async processStreamResponse(
    response: Response,
    modelAdapter: IModelAdapter,
    requestMessages: any[],
    currentModel: { provider: AiModelProvider; model: AiModel },
    onEvent: (event: StreamEvent) => void,
    responseContext: ModelResponseContext // 添加参数
  ): Promise<{ fullContent: string; toolResultSummary: string }> {
    let fullContent = "";
    let toolResultSummary = "";
    const toolCallsData: any[] = [];
    let isCollectingToolCall = false;
    let currentToolCall: any = null;

    responseContext.setMetadata(
      "streamProcessingStarted",
      new Date().toISOString()
    );
    let chunkCount = 0;

    try {
      // 遍历响应流
      for await (const chunk of readStreamChunks(response)) {
        chunkCount++;

        try {
          // 解析响应块
          const parsed = modelAdapter.parseStreamChunk(chunk);

          // 处理流块并传递响应上下文
          const result = await this.processStreamChunk(
            parsed,
            toolCallsData,
            isCollectingToolCall,
            currentToolCall,
            fullContent,
            toolResultSummary,
            modelAdapter,
            requestMessages,
            currentModel,
            onEvent,
            responseContext // 传递响应上下文
          );

          // 更新状态
          let newToolCallsData = result.toolCallsData;
          isCollectingToolCall = result.isCollectingToolCall;
          currentToolCall = result.currentToolCall;
          fullContent = result.fullContent;
          toolResultSummary = result.toolResultSummary;

          // 更新上下文
          // responseContext.updateFullContent(fullContent);
          responseContext.setMetadata("processedChunks", chunkCount);
        } catch (error: any) {
          responseContext.setMetadata(
            "chunkError",
            error.message || String(error)
          );
          responseContext.setMetadata("errorChunk", chunkCount);
          console.error("处理响应块时出错:", error);
        }
      }

      responseContext.setMetadata(
        "streamProcessingCompleted",
        new Date().toISOString()
      );
      responseContext.setMetadata("totalChunks", chunkCount);

      return { fullContent, toolResultSummary };
    } catch (error) {
      responseContext.setMetadata(
        "streamProcessingError",
        error || String(error)
      );
      throw error;
    }
  }

  /**
   * 处理单个流式数据块
   * @param parsed 解析后的数据
   * @param toolCallsData 工具调用数据
   * @param isCollectingToolCall 是否正在收集工具调用
   * @param currentToolCall 当前工具调用
   * @param fullContent 完整内容
   * @param toolResultSummary 工具结果摘要
   * @param modelAdapter 模型适配器
   * @param requestMessages 请求消息
   * @param currentModel 当前模型信息
   * @param onEvent 接收流事件的回调函数
   * @returns 更新后的状态
   * @private
   */
  private async processStreamChunk(
    parsed: any,
    toolCallsData: any[],
    isCollectingToolCall: boolean,
    currentToolCall: any,
    fullContent: string,
    toolResultSummary: string,
    modelAdapter: IModelAdapter,
    requestMessages: any[],
    currentModel: { provider: AiModelProvider; model: AiModel },
    onEvent: (event: StreamEvent) => void,
    responseContext: ModelResponseContext // 添加参数
  ): Promise<{
    toolCallsData: any[];
    isCollectingToolCall: boolean;
    currentToolCall: any;
    fullContent: string;
    toolResultSummary: string;
  }> {
    // 检查是否有delta内容
    const delta = parsed?.choices?.[0]?.delta || parsed?.delta;

    // 更新处理状态
    responseContext.setMetadata("lastChunkProcessed", new Date().toISOString());
    const messageId = responseContext.getMetadata("messageId");

    // 处理内容更新
    if (delta?.content) {
      fullContent = this.handleContent(
        messageId,
        delta.content,
        fullContent,
        onEvent
      );
      responseContext.updateFullContent(fullContent);
    }
    console.log(
      "finish_reason",
      parsed.id,
      parsed.choices?.[0]?.finish_reason,
      new Date().toDateString()
    );
    if (parsed.choices?.[0]?.finish_reason === "stop") {
      responseContext.setMetadata("streamCompleted", new Date().toDateString());
      console.log(
        "流式响应结束",
        messageId,
        new Date().toISOString(),
        responseContext.getFullContent()
      );
      // this.updateMessageAndTopic(message, fullContent, toolResultSummary, topicId, currentModel, responseContext);
    }

    // 处理工具调用
    if (delta?.tool_calls || delta?.tool_call) {
      // 记录工具调用开始
      if (!responseContext.getMetadata("firstToolCallDetected")) {
        responseContext.setMetadata(
          "firstToolCallDetected",
          new Date().toISOString()
        );
      }

      // 判断处理方式
      if (modelAdapter.supportsEmbeddedToolCalls()) {
        // 处理嵌入式工具调用
        const result = await this.handleEmbeddedToolCall(
          parsed,
          toolCallsData,
          toolResultSummary,
          modelAdapter,
          requestMessages,
          currentModel,
          onEvent,
          responseContext // 传递响应上下文
        );

        toolCallsData = result.toolCallsData;
        toolResultSummary = result.toolResultSummary;
      } else {
        // 处理标准工具调用
        const result = await this.handleStandardToolCall(
          parsed,
          toolCallsData,
          isCollectingToolCall,
          currentToolCall,
          toolResultSummary,
          modelAdapter,
          requestMessages,
          currentModel,
          onEvent,
          responseContext // 传递响应上下文
        );

        toolCallsData = result.toolCallsData;
        isCollectingToolCall = result.isCollectingToolCall;
        currentToolCall = result.currentToolCall;
        toolResultSummary = result.toolResultSummary;
      }

      // 更新工具调用数据
      for (const toolCall of toolCallsData) {
        responseContext.addToolCallData(toolCall);
      }
      responseContext.updateToolResultSummary(toolResultSummary);
    }

    return {
      toolCallsData,
      isCollectingToolCall,
      currentToolCall,
      fullContent,
      toolResultSummary,
    };
  }

  /**
   * 处理标准格式的工具调用
   * 负责解析、收集和执行标准格式的工具调用请求
   *
   * @param parsed 解析后的数据 - 从流式响应解析出的JSON对象
   * @param toolCallsData 工具调用数据 - 存储所有已收集的工具调用信息的数组
   * @param isCollectingToolCall 是否正在收集工具调用 - 标记当前是否正在收集工具调用参数
   * @param currentToolCall 当前工具调用 - 当前正在处理的工具调用对象
   * @param toolResultSummary 工具结果摘要 - 所有工具调用结果的文本摘要
   * @param modelAdapter 模型适配器 - 用于处理特定AI模型格式的适配器
   * @param requestMessages 请求消息 - 发送给AI模型的原始请求消息数组
   * @param currentModel 当前模型信息 - 包含当前使用的AI模型提供商和模型详情
   * @param onEvent 接收流事件的回调函数 - 用于将事件通知传递给上层组件
   * @returns 更新后的状态 - 包含更新后的工具调用数据、收集状态、当前工具调用和工具结果摘要
   */
  private async handleStandardToolCall(
    parsed: any,
    toolCallsData: any[],
    isCollectingToolCall: boolean,
    currentToolCall: any,
    toolResultSummary: string,
    modelAdapter: IModelAdapter,
    requestMessages: any[],
    currentModel: { provider: AiModelProvider; model: AiModel },
    onEvent: (event: StreamEvent) => void,
    responseContext: ModelResponseContext // 添加参数
  ): Promise<{
    toolCallsData: any[];
    isCollectingToolCall: boolean;
    currentToolCall: any;
    toolResultSummary: string;
  }> {
    // 从解析的数据中提取delta和message对象，这些是不同模型可能使用的格式
    const delta = parsed.choices?.[0]?.delta;
    const message = parsed.choices?.[0]?.message;

    // 尝试从delta或message中获取工具调用数据，支持不同模型的格式
    const toolCalls = delta?.tool_calls || message?.tool_calls;

    // 检查工具调用上下文是否已初始化，如果没有则抛出错误
    if (!this.toolCallContext) {
      throw new Error("工具调用上下文未初始化");
    }

    // 从工具调用上下文获取消息ID，用于事件通知
    const messageId = this.toolCallContext.getMessageId();

    // 如果检测到工具调用数据
    if (toolCalls && toolCalls.length > 0) {
      // 记录日志，显示检测到的工具调用
      console.log(
        `检测到工具调用-handleStatdToolCall: ${JSON.stringify(toolCalls)}`
      );

      // 如果这是第一次检测到工具调用（工具调用数组为空），发送工具链开始事件
      if (toolCallsData.length === 0) {
        onEvent(
          StreamEventFactory.createToolChainEvent(
            StreamEventType.TOOL_CHAIN_START,
            messageId
          )
        );
      }

      // 遍历所有工具调用
      for (const call of toolCalls) {
        // 提取工具调用的索引、ID、名称和参数
        const index = call.index || 0;
        const id = call.id;
        const name = call.function?.name;
        const args = call.function?.arguments || "";

        // 如果是新的工具调用（通过ID和索引判断）
        if (id && !toolCallsData[index]) {
          // 记录日志，显示新工具调用的信息
          console.log(`新工具调用: id=${id}, name=${name},args=${args}`);

          // 在工具调用数据数组中创建新的工具调用记录
          toolCallsData[index] = {
            id,
            name,
            args: "", // 初始化空参数字符串，后续会累积
          };

          // 在工具调用上下文中创建工具调用记录
          this.toolCallContext.createToolCall(id, name || "unknown");

          // 发送工具参数开始事件，通知上层组件开始收集参数
          onEvent(
            StreamEventFactory.createToolEvent(
              StreamEventType.TOOL_ARGS_START,
              messageId,
              id,
              name || "unknown"
            )
          );

          // 更新工具调用状态为"收集参数中"
          this.toolCallContext.updateToolCallState(
            id,
            ToolCallState.COLLECTING_ARGS
          );

          // 设置收集状态为true，表示正在收集工具调用参数
          isCollectingToolCall = true;

          // 设置当前工具调用为新创建的工具调用
          currentToolCall = toolCallsData[index];
        }

        // 如果当前有工具调用且有参数，将参数添加到当前工具调用
        if (currentToolCall) {
          // 记录日志，显示添加的参数
          console.log(`添加参数: ${args}`);

          // 累积参数字符串
          currentToolCall.args += args;

          // 更新工具调用数据数组中的当前工具调用
          toolCallsData[index] = currentToolCall;
        }
      }

      // 检查是否完成了工具调用，通过分析模型返回的完成原因
      const finishReason = parsed.choices?.[0]?.finish_reason;
      const delta = parsed.choices?.[0]?.delta;
      const model = parsed.model || "";

      // 处理不同模型的完成信号
      // 1. 标准完成信号: finishReason 为 "tool_calls"
      // 2. 某些模型可能有特殊情况
      const isStandardDone = finishReason === "tool_calls";

      // 添加详细日志，帮助调试判断条件
      console.log(`检查工具调用参数收集完成状态: 
        model=${model}, 
        finishReason=${finishReason}, 
        isStandardDone=${isStandardDone}, 
        isCollectingToolCall=${isCollectingToolCall}, 
        currentToolCall=${
          currentToolCall ? JSON.stringify(currentToolCall) : "null"
        }`);

      // 判断参数是否已完整收集
      // 通过检查参数字符串是否以"}"或"]"结尾来判断JSON对象或数组是否完整
      const hasCompleteArgs =
        isCollectingToolCall &&
        currentToolCall &&
        currentToolCall.args &&
        (currentToolCall.args.trim().endsWith("}") ||
          currentToolCall.args.trim().endsWith("]"));

      // 确定工具调用是否完成
      const isToolCallComplete = hasCompleteArgs;

      // 如果工具调用完成且正在收集参数且有当前工具调用
      if (isToolCallComplete && isCollectingToolCall && currentToolCall) {
        // 记录日志，显示工具调用参数收集完成
        console.log(`工具调用参数收集完成: ${JSON.stringify(currentToolCall)}`);

        // 发送工具参数完成事件，通知上层组件参数收集已完成
        onEvent(
          StreamEventFactory.createToolEvent(
            StreamEventType.TOOL_ARGS_COMPLETE,
            messageId,
            currentToolCall.id,
            currentToolCall.name,
            { params: currentToolCall.args }
          )
        );

        // 更新工具调用状态为"执行中"
        this.toolCallContext.updateToolCallState(
          currentToolCall.id,
          ToolCallState.EXECUTING,
          { result: currentToolCall.args }
        );

        // 发送MCP工具开始事件，通知上层组件开始执行工具
        onEvent(
          StreamEventFactory.createToolEvent(
            StreamEventType.MCP_TOOL_START,
            messageId,
            currentToolCall.id,
            currentToolCall.name,
            { params: currentToolCall.args }
          )
        );

        // 调用handleToolCall函数处理工具调用，执行实际的工具操作
        const result = await this.handleToolCall(
          [currentToolCall],
          requestMessages,
          currentModel,
          modelAdapter,
          responseContext,
          onEvent
        );

        // 将工具调用结果摘要添加到总摘要中
        toolResultSummary += result.summary || "";

        // 重置收集状态为false，表示不再收集参数
        isCollectingToolCall = false;

        // 重置当前工具调用为null，准备处理下一个工具调用
        currentToolCall = null;
      }
    }

    // 提取工具调用部分
    const toolCall = delta?.tool_calls?.[0] || delta?.tool_call;

    // 记录到响应上下文
    if (
      toolCall?.id &&
      !responseContext.getMetadata(`toolCall_${toolCall.id}_detected`)
    ) {
      responseContext.setMetadata(
        `toolCall_${toolCall.id}_detected`,
        new Date().toISOString()
      );
    }

    let completeToolCall: any = null;

    // 收集工具调用
    // if (toolCall) {
    //   // ... 现有代码 ...

    //   // 完整工具调用形成后
    //   if (completeToolCall) {
    //     // 记录完整工具调用
    //     responseContext.setMetadata(
    //       `toolCall_${completeToolCall.id}_complete`,
    //       new Date().toISOString()
    //     );
    //     responseContext.setMetadata(
    //       `toolCall_${completeToolCall.id}_name`,
    //       completeToolCall.function?.name
    //     );

    //     // 执行工具调用
    //     if (completeToolCall.function?.name) {
    //       responseContext.setMetadata(
    //         `toolCall_${completeToolCall.id}_execution_start`,
    //         new Date().toISOString()
    //       );

    //       // 执行工具并获取结果
    //       const result = await this.mcpToolHandler.handleFunctionCall(
    //         completeToolCall.function.name,
    //         completeToolCall.function.arguments,
    //         null // 工具上下文
    //       );

    //       responseContext.setMetadata(
    //         `toolCall_${completeToolCall.id}_execution_end`,
    //         new Date().toISOString()
    //       );
    //       responseContext.setMetadata(
    //         `toolCall_${completeToolCall.id}_result_available`,
    //         true
    //       );

    //       // 记录工具调用结果
    //       if (result !== undefined) {
    //         // 处理结果
    //         // ... 现有代码 ...

    //         // 更新工具结果摘要
    //         responseContext.updateToolResultSummary(toolResultSummary);
    //       }
    //     }
    //   }
    // }

    return {
      toolCallsData,
      isCollectingToolCall,
      currentToolCall,
      toolResultSummary,
    };
  }

  /**
   * 处理内容中嵌入的工具调用
   * @param parsed 解析后的数据
   * @param toolCallsData 工具调用数据
   * @param toolResultSummary 工具结果摘要
   * @param modelAdapter 模型适配器
   * @param requestMessages 请求消息
   * @param currentModel 当前模型信息
   * @param onEvent 接收流事件的回调函数
   * @returns 更新后的状态
   * @private
   */
  private async handleEmbeddedToolCall(
    parsed: any,
    toolCallsData: any[],
    toolResultSummary: string,
    modelAdapter: IModelAdapter,
    requestMessages: any[],
    currentModel: { provider: AiModelProvider; model: AiModel },
    onEvent: (event: StreamEvent) => void,
    responseContext: ModelResponseContext // 添加参数
  ): Promise<{
    toolCallsData: any[];
    toolResultSummary: string;
  }> {
    // 从解析的数据中提取工具调用
    const embeddedToolCalls = modelAdapter.extractEmbeddedToolCalls(parsed);

    // 记录嵌入式工具调用
    responseContext.setMetadata(
      "embeddedToolCallDetected",
      new Date().toISOString()
    );
    responseContext.setMetadata(
      "embeddedToolCallCount",
      (responseContext.getMetadata("embeddedToolCallCount") || 0) + 1
    );

    // 处理工具调用
    if (embeddedToolCalls && embeddedToolCalls.length > 0) {
      for (const toolCall of embeddedToolCalls) {
        // 记录单个工具调用
        const toolCallId = toolCall.id || `embedded-${Date.now()}`;
        responseContext.setMetadata(
          `embeddedToolCall_${toolCallId}_detected`,
          new Date().toISOString()
        );

        // 执行工具调用
        if (toolCall.name) {
          responseContext.setMetadata(
            `embeddedToolCall_${toolCallId}_execution_start`,
            new Date().toISOString()
          );

          try {
            // 执行工具调用
            const result = await this.mcpToolHandler.handleFunctionCall(
              toolCall.name,
              toolCall.arguments,
              null // 工具上下文
            );

            responseContext.setMetadata(
              `embeddedToolCall_${toolCallId}_execution_end`,
              new Date().toISOString()
            );
            responseContext.setMetadata(
              `embeddedToolCall_${toolCallId}_success`,
              true
            );

            // 更新工具调用数据
            toolCallsData.push({
              id: toolCallId,
              type: "embedded",
              name: toolCall.name,
              arguments: toolCall.arguments,
              result: result,
            });

            // 添加到响应上下文
            responseContext.addToolCallData({
              id: toolCallId,
              type: "embedded",
              name: toolCall.name,
              arguments: toolCall.arguments,
              result: result,
            });

            // 更新工具结果摘要
            // ... 现有代码 ...
            responseContext.updateToolResultSummary(toolResultSummary);
          } catch (error) {
            responseContext.setMetadata(
              `embeddedToolCall_${toolCallId}_error`,
              error || String(error)
            );
            // ... 错误处理 ...
          }
        }
      }
    }

    return { toolCallsData, toolResultSummary };
  }

  /**
   * 更新消息和话题
   * @param message 消息
   * @param fullContent 完整内容
   * @param toolResultSummary 工具结果摘要
   * @param topicId 话题ID
   * @param currentModel 当前模型信息
   * @returns 更新后的消息
   * @private
   */
  private async updateMessageAndTopic(
    message: Message,
    fullContent: string,
    toolResultSummary: string,
    topicId: string,
    currentModel: { provider: AiModelProvider; model: AiModel },
    responseContext?: ModelResponseContext // 添加可选参数
  ): Promise<Message> {
    // 记录更新开始
    if (responseContext) {
      responseContext.setMetadata(
        "messageUpdateStart",
        new Date().toISOString()
      );
    }

    // 更新消息内容
    const updatedMessage = await this.messageRepository.update(message.id, {
      content: fullContent,
      toolResultSummary: toolResultSummary || undefined,
      updatedAt: new Date(),
      status: MessageStatus.Done,
      model: {
        id: currentModel.model.id,
        provider: currentModel.provider.id,
        name: currentModel.model.name,
      },
    } as Partial<Message>);

    // 记录消息更新信息
    if (responseContext) {
      responseContext.setMetadata("messageUpdated", true);
      responseContext.setMetadata(
        "messageUpdateCompleted",
        new Date().toISOString()
      );
    }

    // 更新话题信息
    // ... 现有代码 ...

    return updatedMessage;
  }

  /**
   * 处理流式响应错误
   * @param message 消息
   * @param error 错误
   * @param topicId 话题ID
   * @returns 更新后的消息
   * @private
   */
  private async handleStreamError(
    message: Message,
    error: unknown,
    topicId: string,
    responseContext?: ModelResponseContext // 添加可选参数
  ): Promise<Message> {
    // 记录错误信息
    if (responseContext) {
      responseContext.setMetadata("streamError", error || String(error));
      responseContext.setMetadata(
        "errorHandlingStarted",
        new Date().toISOString()
      );
    }

    console.error("生成AI回复时出错:", error);

    // 更新消息状态为错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    const updatedMessage = await this.messageRepository.update(message.id, {
      content: `生成回复时出错: ${errorMessage}`,
      status: MessageStatus.Error,
      updatedAt: new Date(),
    } as Partial<Message>);

    // 记录错误处理完成
    if (responseContext) {
      responseContext.setMetadata(
        "errorHandlingCompleted",
        new Date().toISOString()
      );
    }

    return updatedMessage;
  }

  /**
   * 处理流式响应中的工具调用
   * @param toolCalls 工具调用数据
   * @param originalMessages 原始消息
   * @param currentModel 当前模型
   * @param modelAdapter 模型适配器
   * @param onEvent 接收流事件的回调函数
   * @returns 工具调用结果信息
   * @private
   */
  private async handleStreamToolCalls(
    toolCalls: any[],
    originalMessages: any[],
    currentModel: { provider: AiModelProvider; model: AiModel },
    modelAdapter: IModelAdapter,
    onEvent: (event: StreamEvent) => void
  ): Promise<{ summary?: string }> {
    const messageId =
      this.toolCallContext?.getMessageId() || `msg-${Date.now()}`;

    try {
      console.log(`处理流式工具调用: ${JSON.stringify(toolCalls)}`);

      // 提取工具调用
      const extractedCalls = toolCalls.map((call) => ({
        id: call.id,
        name: call.name || (call.function && call.function.name) || "unknown",
        args: call.args || (call.function && call.function.arguments) || {},
      }));
      console.log(`提取的工具调用: ${JSON.stringify(extractedCalls)}`);

      // 处理工具调用
      console.log("开始处理工具调用...");

      // 发送MCP工具执行事件
      for (const call of extractedCalls) {
        onEvent(
          StreamEventFactory.createToolEvent(
            StreamEventType.MCP_TOOL_EXECUTING,
            messageId,
            call.id,
            call.name,
            { params: call.args }
          )
        );
      }

      // 设置超时处理
      const timeoutPromise = new Promise<any[]>((_, reject) => {
        setTimeout(() => {
          reject(new Error("工具调用超时"));
        }, 30000); // 30秒超时
      });

      try {
        // 使用 Promise.race 实现超时处理
        const toolResults = await Promise.race([
          this.mcpToolHandler.handleToolCalls(extractedCalls),
          timeoutPromise,
        ]);
        console.log(`工具调用结果: ${JSON.stringify(toolResults)}`);

        // 构建包含工具调用结果的新消息
        const toolResultMessages = [];
        let toolResultSummary = "";
        const successfulToolCalls = [];

        for (const result of toolResults) {
          const { toolCallId, toolName, result: toolResult, error } = result;

          // 通知用户工具调用结果
          const resultStr =
            error ||
            (typeof toolResult === "string"
              ? toolResult
              : JSON.stringify(toolResult, null, 2));
          console.log(`工具 ${toolName} 调用结果: ${resultStr}`);

          if (error) {
            // 更新工具调用状态为错误
            if (this.toolCallContext) {
              this.toolCallContext.updateToolCallState(
                toolCallId,
                ToolCallState.ERROR,
                { error: resultStr }
              );
            }

            // 发送MCP工具错误事件
            onEvent(
              StreamEventFactory.createToolEvent(
                StreamEventType.MCP_TOOL_ERROR,
                messageId,
                toolCallId,
                toolName,
                { error: resultStr }
              )
            );
          } else {
            // 更新工具调用状态为完成
            if (this.toolCallContext) {
              this.toolCallContext.updateToolCallState(
                toolCallId,
                ToolCallState.COMPLETED,
                { result: toolResult }
              );
            }

            // 发送MCP工具成功事件
            onEvent(
              StreamEventFactory.createToolEvent(
                StreamEventType.MCP_TOOL_SUCCESS,
                messageId,
                toolCallId,
                toolName,
                { result: resultStr }
              )
            );

            // 记录成功的工具调用
            successfulToolCalls.push({
              toolCallId,
              toolResult,
            });
          }

          // 添加到结果摘要 - 不添加额外文本
          toolResultSummary += resultStr;

          // 格式化工具调用结果
          const formattedResults = modelAdapter.formatToolCallResult(
            toolName,
            toolCallId,
            extractedCalls.find((call: any) => call.id === toolCallId)?.args ||
              {},
            error || toolResult
          );
          console.log(
            `格式化后的工具调用结果: ${JSON.stringify(formattedResults)}`
          );

          toolResultMessages.push(...formattedResults);
        }

        // // 如果有成功的工具调用，将结果发送给大模型
        // if (successfulToolCalls.length > 0) {
        //   // 选择第一个成功的工具调用结果发送给大模型
        //   // 注意：这里可以根据需要修改逻辑，例如合并多个工具调用结果
        //   const { toolCallId, toolResult } = successfulToolCalls[0];
        //   console.log(`将工具调用结果发送给大模型: ${JSON.stringify(toolResult)}`);

        //   await this.sendNewRequestWithToolResult(
        //     toolCallId,
        //     toolResult,
        //     originalMessages,
        //     currentModel,
        //     modelAdapter,
        //     onEvent
        //   );
        // }

        // 检查工具链是否完成
        if (this.toolCallContext) {
          const rootToolCalls = this.toolCallContext.getRootToolCalls();
          let allCompleted = true;

          for (const rootCall of rootToolCalls) {
            if (!this.toolCallContext.isToolChainCompleted(rootCall.id)) {
              allCompleted = false;
              break;
            }
          }

          // 如果所有工具调用都已完成，发送工具链完成事件
          if (allCompleted && rootToolCalls.length > 0) {
            // 收集所有工具调用ID
            const toolCallIds = rootToolCalls.map((call) => call.id);

            // 发送工具链完成事件
            onEvent(
              StreamEventFactory.createToolChainEvent(
                StreamEventType.TOOL_CHAIN_COMPLETE,
                messageId,
                toolCallIds
              )
            );

            console.log(`工具链完成: ${toolCallIds.join(", ")}`);
          }
        }

        // 将工具调用结果添加到原始消息中
        const newMessages = [...originalMessages, ...toolResultMessages];
        console.log(`添加工具调用结果后的消息数量: ${newMessages.length}`);

        return { summary: toolResultSummary };
      } catch (error) {
        // 处理超时或其他错误
        console.error("工具调用执行失败:", error);

        // 更新所有正在执行的工具调用状态
        if (this.toolCallContext) {
          const rootToolCalls = this.toolCallContext.getRootToolCalls();
          const executingCalls = rootToolCalls.filter(
            (call: ToolCallRecord) => call.state === ToolCallState.EXECUTING
          );

          for (const call of executingCalls) {
            // 判断是否为超时错误
            const isTimeout = (error as Error).message === "工具调用超时";
            const errorState = isTimeout
              ? ToolCallState.TIMEOUT
              : ToolCallState.ERROR;

            // 更新工具调用状态
            this.toolCallContext.updateToolCallState(call.id, errorState, {
              error: (error as Error).message,
            });

            // 发送相应的事件
            const eventType = isTimeout
              ? StreamEventType.MCP_TOOL_TIMEOUT
              : StreamEventType.MCP_TOOL_ERROR;

            onEvent(
              StreamEventFactory.createToolEvent(
                eventType,
                messageId,
                call.id,
                call.name,
                { error: (error as Error).message }
              )
            );
          }
        }

        // 返回错误摘要
        return { summary: `工具调用失败: ${(error as Error).message}` };
      }
    } catch (error) {
      // 这里处理其他非工具调用执行过程中的错误
      console.error("处理工具调用过程中出错:", error);
      throw error;
    }
  }

  /**
   * 处理工具调用，如果有tools_call的数据包，则调用此方法，还要处理将工具调用结果返回给大模型
   * @private
   */
  private async handleToolCall(
    toolCalls: any[],
    originalMessages: any[],
    currentModel: { provider: AiModelProvider; model: AiModel },
    modelAdapter: IModelAdapter,
    responseContext: ModelResponseContext,
    onEvent: (event: StreamEvent) => void
  ): Promise<{ summary?: string }> {
    if (!this.toolCallContext) {
      throw new Error("工具调用上下文未初始化");
    }

    const messageId = this.toolCallContext.getMessageId();

    try {
      console.log(`处理工具调用: ${JSON.stringify(toolCalls)}`);

      // 提取工具调用
      const extractedCalls = toolCalls.map((call) => ({
        id: call.id,
        name: call.name || (call.function && call.function.name) || "unknown",
        args: call.args || (call.function && call.function.arguments) || {},
      }));
      console.log(`提取的工具调用: ${JSON.stringify(extractedCalls)}`);

      // 处理工具调用
      console.log("开始处理工具调用...");

      // 发送MCP工具执行事件
      for (const call of extractedCalls) {
        onEvent(
          StreamEventFactory.createToolEvent(
            StreamEventType.MCP_TOOL_EXECUTING,
            messageId,
            call.id,
            call.name,
            { params: call.args }
          )
        );
      }

      // 设置超时处理
      const timeoutPromise = new Promise<any[]>((_, reject) => {
        setTimeout(() => {
          reject(new Error("工具调用超时"));
        }, 30000); // 30秒超时
      });

      try {
        // 使用 Promise.race 实现超时处理
        const toolResults = await Promise.race([
          this.mcpToolHandler.handleToolCalls(extractedCalls),
          timeoutPromise,
        ]);
        console.log(`工具调用结果: ${JSON.stringify(toolResults)}`);

        // 构建包含工具调用结果的新消息
        const toolResultMessages = [];
        let toolResultSummary = "";
        // 收集成功的工具调用
        const successfulToolCalls = [];

        for (const result of toolResults) {
          const { toolCallId, toolName, result: toolResult, error } = result;

          // 通知用户工具调用结果
          const resultStr =
            error ||
            (typeof toolResult === "string"
              ? toolResult
              : JSON.stringify(toolResult, null, 2));
          console.log(`工具 ${toolName} 调用结果: ${resultStr}`);

          if (error) {
            // 更新工具调用状态为错误
            if (this.toolCallContext) {
              this.toolCallContext.updateToolCallState(
                toolCallId,
                ToolCallState.ERROR,
                { error: resultStr }
              );
            }

            // 发送MCP工具错误事件
            onEvent(
              StreamEventFactory.createToolEvent(
                StreamEventType.MCP_TOOL_ERROR,
                messageId,
                toolCallId,
                toolName,
                { error: resultStr }
              )
            );
          } else {
            // 更新工具调用状态为完成
            if (this.toolCallContext) {
              this.toolCallContext.updateToolCallState(
                toolCallId,
                ToolCallState.COMPLETED,
                { result: toolResult }
              );
            }

            // 发送MCP工具成功事件
            onEvent(
              StreamEventFactory.createToolEvent(
                StreamEventType.MCP_TOOL_SUCCESS,
                messageId,
                toolCallId,
                toolName,
                { result: resultStr }
              )
            );

            // 记录成功的工具调用
            successfulToolCalls.push({
              toolCallId,
              toolResult,
            });
          }

          // 添加到结果摘要 - 不添加额外文本
          toolResultSummary += resultStr;

          // 格式化工具调用结果
          const formattedResults = modelAdapter.formatToolCallResult(
            toolName,
            toolCallId,
            extractedCalls.find((call: any) => call.id === toolCallId)?.args ||
              {},
            error || toolResult
          );
          console.log(
            `格式化后的工具调用结果: ${JSON.stringify(formattedResults)}`
          );

          toolResultMessages.push(...formattedResults);
        }

        // 如果有成功的工具调用，将结果发送给大模型
        if (successfulToolCalls.length > 0) {
          // 选择第一个成功的工具调用结果发送给大模型
          // 注意：这里可以根据需要修改逻辑，例如合并多个工具调用结果
          const { toolCallId, toolResult } = successfulToolCalls[0];
          console.log(
            `将工具调用结果发送给大模型: ${JSON.stringify(toolResult)}`
          );

          const new_response = await this.sendNewRequestWithToolResult(
            toolCallId,
            toolResult,
            originalMessages,
            currentModel,
            modelAdapter,
            onEvent
          );

          const { fullContent, toolResultSummary } =
            await this.processStreamResponse(
              new_response,
              modelAdapter,
              originalMessages,
              currentModel,
              onEvent,
              responseContext
            );

          // await this.updateMessageAndTopic(
          //   responseContext.getMetadata("message"),
          //   fullContent,
          //   toolResultSummary,
          //   responseContext.getMetadata("topicId"),
          //   currentModel,
          //   responseContext
          // );
        }

        // 检查工具链是否完成
        if (this.toolCallContext) {
          const rootToolCalls = this.toolCallContext.getRootToolCalls();
          let allCompleted = true;

          for (const rootCall of rootToolCalls) {
            if (!this.toolCallContext.isToolChainCompleted(rootCall.id)) {
              allCompleted = false;
              break;
            }
          }

          // 如果所有工具调用都已完成，发送工具链完成事件
          if (allCompleted && rootToolCalls.length > 0) {
            // 收集所有工具调用ID
            const toolCallIds = rootToolCalls.map((call) => call.id);

            // 发送工具链完成事件
            onEvent(
              StreamEventFactory.createToolChainEvent(
                StreamEventType.TOOL_CHAIN_COMPLETE,
                messageId,
                toolCallIds
              )
            );

            console.log(`工具链完成: ${toolCallIds.join(", ")}`);
          }
        }

        // 将工具调用结果添加到原始消息中
        const newMessages = [...originalMessages, ...toolResultMessages];
        console.log(`添加工具调用结果后的消息数量: ${newMessages.length}`);

        return { summary: toolResultSummary };
      } catch (error) {
        // 处理超时或其他错误
        console.error("工具调用执行失败:", error);

        // 更新所有正在执行的工具调用状态
        if (this.toolCallContext) {
          const rootToolCalls = this.toolCallContext.getRootToolCalls();
          const executingCalls = rootToolCalls.filter(
            (call: ToolCallRecord) => call.state === ToolCallState.EXECUTING
          );

          for (const call of executingCalls) {
            // 判断是否为超时错误
            const isTimeout = (error as Error).message === "工具调用超时";
            const errorState = isTimeout
              ? ToolCallState.TIMEOUT
              : ToolCallState.ERROR;

            // 更新工具调用状态
            this.toolCallContext.updateToolCallState(call.id, errorState, {
              error: (error as Error).message,
            });

            // 发送相应的事件
            const eventType = isTimeout
              ? StreamEventType.MCP_TOOL_TIMEOUT
              : StreamEventType.MCP_TOOL_ERROR;

            onEvent(
              StreamEventFactory.createToolEvent(
                eventType,
                messageId,
                call.id,
                call.name,
                { error: (error as Error).message }
              )
            );
          }
        }

        // 返回错误摘要
        return { summary: `工具调用失败: ${(error as Error).message}` };
      }
    } catch (error) {
      // 这里处理其他非工具调用执行过程中的错误
      console.error("处理工具调用过程中出错:", error);
      throw error;
    }
  }

  /**
   * 处理普通内容，不包含tools_call的数据包
   * @private
   */
  private handleContent(
    messageId: string,
    content: string,
    fullContent: string,
    onEvent: (event: StreamEvent) => void
  ): string {
    // 更新并返回完整内容
    onEvent(StreamEventFactory.createTextEvent(messageId, content));
    return content;
  }

  // ==================== 助手相关方法 ====================
  /**
   * 创建新助手
   * @param assistant 助手数据
   * @returns 创建的助手
   */
  async createAssistant(
    assistant: Omit<Assistant, "id" | "createdAt" | "updatedAt">
  ): Promise<Assistant> {
    try {
      const createdAssistant = await this.assistantRepository.create(assistant);
      console.log(
        `创建新助手: ${createdAssistant.id}, 名称: ${createdAssistant.name}`
      );

      // 如果设置为默认助手，需要更新其他助手为非默认
      if (assistant.isDefault) {
        await this.setDefaultAssistant(createdAssistant.id);
      }

      return createdAssistant;
    } catch (error) {
      console.error("创建助手失败:", error);
      throw new Error(
        `创建助手失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 获取所有助手
   * @returns 助手列表
   */
  async getAllAssistants(): Promise<Assistant[]> {
    try {
      return await this.assistantRepository.findAll();
    } catch (error) {
      console.error("获取助手列表失败:", error);
      throw new Error(
        `获取助手列表失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 获取助手详情
   * @param id 助手ID
   * @returns 助手详情或null（如果不存在）
   */
  async getAssistant(id: string): Promise<Assistant | null> {
    try {
      return await this.assistantRepository.findById(id);
    } catch (error) {
      console.error(`获取助手详情失败 (ID: ${id}):`, error);
      throw new Error(
        `获取助手详情失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 更新助手
   * @param id 助手ID
   * @param data 要更新的字段
   * @returns 更新后的助手
   */
  async updateAssistant(
    id: string,
    data: Partial<Assistant>
  ): Promise<Assistant> {
    try {
      // 确保更新时间字段
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      const updatedAssistant = await this.assistantRepository.update(
        id,
        updateData
      );
      console.log(`更新助手: ${id}`);

      // 如果设置为默认助手，需要更新其他助手为非默认
      if (data.isDefault) {
        await this.setDefaultAssistant(id);
      }

      return updatedAssistant;
    } catch (error) {
      console.error(`更新助手失败 (ID: ${id}):`, error);
      throw new Error(
        `更新助手失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 删除助手
   * @param id 助手ID
   */
  async deleteAssistant(id: string): Promise<void> {
    try {
      // 检查是否为默认助手
      const assistant = await this.assistantRepository.findById(id);
      if (!assistant) {
        throw new Error(`助手不存在: ${id}`);
      }

      if (assistant.isDefault) {
        throw new Error("不能删除默认助手");
      }

      // 删除助手
      await this.assistantRepository.delete(id);
      console.log(`删除助手: ${id}`);
    } catch (error) {
      console.error(`删除助手失败 (ID: ${id}):`, error);
      throw new Error(
        `删除助手失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 获取默认助手
   * @returns 默认助手或null（如果不存在）
   */
  async getDefaultAssistant(): Promise<Assistant | null> {
    try {
      return await this.assistantRepository.findDefault();
    } catch (error) {
      console.error("获取默认助手失败:", error);
      throw new Error(
        `获取默认助手失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 设置默认助手
   * @param id 助手ID
   */
  async setDefaultAssistant(id: string): Promise<void> {
    try {
      // 检查助手是否存在
      const assistant = await this.assistantRepository.findById(id);
      if (!assistant) {
        throw new Error(`助手不存在: ${id}`);
      }

      // 设置为默认助手
      await this.assistantRepository.setDefault(id);
      console.log(`设置默认助手: ${id}`);
    } catch (error) {
      console.error(`设置默认助手失败 (ID: ${id}):`, error);
      throw new Error(
        `设置默认助手失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 根据助手创建话题
   * @param assistantId 助手ID
   * @param title 话题标题（可选，默认使用助手名称）
   * @returns 创建的话题
   */
  async createTopicFromAssistant(
    assistantId: string,
    title?: string
  ): Promise<Topic> {
    try {
      // 获取助手详情
      const assistant = await this.assistantRepository.findById(assistantId);
      if (!assistant) {
        throw new Error(`助手不存在: ${assistantId}`);
      }

      // 创建新话题
      const now = new Date().toISOString();
      const newTopic: Omit<Topic, "id"> = {
        title: title || `与${assistant.name}的对话 - ${now}`, // 添加时间戳确保唯一性
        sourceAssistantId: assistantId,
        currentConfig: {
          providerId: assistant.providerId,
          modelId: assistant.modelId,
          systemPrompt: assistant.systemPrompt,
          temperature: assistant.temperature,
        },
        messageCount: 0,
        lastProviderId: assistant.providerId,
        lastModelId: assistant.modelId,
        createdAt: now,
        updatedAt: now,
      };

      // 使用存储库创建话题
      const topic = await this.topicRepository.create(newTopic);
      console.log(
        `从助手创建新话题: ${topic.id}, 标题: ${topic.title}, 助手: ${assistant.name}`
      );

      // 如果助手有系统提示词，添加为系统消息
      if (assistant.systemPrompt) {
        await this.sendSystemMessage(topic.id, assistant.systemPrompt);
      }

      return topic;
    } catch (error) {
      console.error(`从助手创建话题失败 (助手ID: ${assistantId}):`, error);
      throw new Error(
        `从助手创建话题失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 从话题创建助手
   * @param topicId 话题ID
   * @param name 新助手名称
   * @param description 新助手描述（可选）
   * @returns 创建的助手
   */
  async createAssistantFromTopic(
    topicId: string,
    name: string,
    description?: string
  ): Promise<Assistant> {
    try {
      // 获取话题详情
      const topic = await this.topicRepository.findById(topicId);
      if (!topic) {
        throw new Error(`话题不存在: ${topicId}`);
      }

      // 获取话题的系统消息
      const messages = await this.messageRepository.findByTopicId(topicId);
      const systemMessages = messages.filter((msg) => msg.role === "system");

      // 提取系统提示词（使用第一条系统消息）
      let systemPrompt = "";
      if (systemMessages.length > 0) {
        systemPrompt = systemMessages[0].content;
      }

      // 创建新助手
      const now = new Date().toISOString();
      const newAssistant: Omit<Assistant, "id" | "createdAt" | "updatedAt"> = {
        name,
        description: description || `从话题 "${topic.title}" 创建的助手`,
        providerId: topic.lastProviderId,
        modelId: topic.lastModelId,
        systemPrompt:
          systemPrompt || "你是一个有用的AI助手，可以回答用户的各种问题。",
        temperature: topic.currentConfig?.temperature || 0.7,
        memoryStrategy: topic.currentConfig?.memoryStrategy as
          | "simple"
          | "summarize"
          | "selective"
          | undefined,
        contextWindowSize: topic.currentConfig?.contextWindowSize,
        enabledToolIds: topic.currentConfig?.enabledToolIds,
        knowledgeBaseIds: topic.currentConfig?.knowledgeBaseIds,
        isDefault: false,
      };

      // 使用存储库创建助手
      const assistant = await this.assistantRepository.create(newAssistant);
      console.log(
        `从话题创建新助手: ${assistant.id}, 名称: ${assistant.name}, 话题: ${topic.title}`
      );

      return assistant;
    } catch (error) {
      console.error(`从话题创建助手失败 (话题ID: ${topicId}):`, error);
      throw new Error(
        `从话题创建助手失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  /**
   * 获取助手统计信息
   * @returns 助手总数
   */
  async getAssistantStats(): Promise<{ total: number }> {
    try {
      const count = await this.assistantRepository.count();
      return { total: count };
    } catch (error) {
      console.error("获取助手统计信息失败:", error);
      return { total: 0 };
    }
  }

  /**
   * 复制助手
   * @param id 要复制的助手ID
   * @param newName 新助手名称（可选，默认为"复制 - 原名称"）
   * @returns 创建的新助手
   */
  async duplicateAssistant(id: string, newName?: string): Promise<Assistant> {
    try {
      // 获取原助手详情
      const sourceAssistant = await this.assistantRepository.findById(id);
      if (!sourceAssistant) {
        throw new Error(`助手不存在: ${id}`);
      }

      // 创建新助手数据
      const {
        id: _,
        createdAt: __,
        updatedAt: ___,
        isDefault: ____,
        ...assistantData
      } = sourceAssistant;

      const newAssistant: Omit<Assistant, "id" | "createdAt" | "updatedAt"> = {
        ...assistantData,
        name: newName || `复制 - ${sourceAssistant.name}`,
        isDefault: false,
      };

      // 创建新助手
      const assistant = await this.assistantRepository.create(newAssistant);
      console.log(`复制助手: 从 ${id} 创建 ${assistant.id}`);

      return assistant;
    } catch (error) {
      console.error(`复制助手失败 (ID: ${id}):`, error);
      throw new Error(
        `复制助手失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 导出助手配置
   * @param id 助手ID
   * @returns 助手配置JSON字符串
   */
  async exportAssistant(id: string): Promise<string> {
    try {
      // 获取助手详情
      const assistant = await this.assistantRepository.findById(id);
      if (!assistant) {
        throw new Error(`助手不存在: ${id}`);
      }

      // 移除不需要导出的字段
      const {
        id: _,
        createdAt,
        updatedAt,
        isDefault,
        ...exportData
      } = assistant;

      // 添加元数据
      const exportObject = {
        ...exportData,
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };

      // 转换为JSON字符串
      return JSON.stringify(exportObject, null, 2);
    } catch (error) {
      console.error(`导出助手失败 (ID: ${id}):`, error);
      throw new Error(
        `导出助手失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 导入助手配置
   * @param configJson 助手配置JSON字符串
   * @returns 创建的助手
   */
  async importAssistant(configJson: string): Promise<Assistant> {
    try {
      // 解析JSON
      const importData = JSON.parse(configJson);

      // 验证必要字段
      if (!importData.name || !importData.systemPrompt) {
        throw new Error("导入的助手配置缺少必要字段");
      }

      // 创建新助手
      const newAssistant: Omit<Assistant, "id" | "createdAt" | "updatedAt"> = {
        name: importData.name,
        description: importData.description,
        avatar: importData.avatar,
        providerId: importData.providerId,
        modelId: importData.modelId,
        systemPrompt: importData.systemPrompt,
        temperature: importData.temperature,
        memoryStrategy: importData.memoryStrategy,
        contextWindowSize: importData.contextWindowSize,
        enabledToolIds: importData.enabledToolIds,
        knowledgeBaseIds: importData.knowledgeBaseIds,
        tags: importData.tags,
        isDefault: false,
      };

      // 创建助手
      const assistant = await this.assistantRepository.create(newAssistant);
      console.log(`导入助手: ${assistant.id}, 名称: ${assistant.name}`);

      return assistant;
    } catch (error) {
      console.error("导入助手失败:", error);
      throw new Error(
        `导入助手失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 创建默认助手
   * @param providerId 提供商ID
   * @param modelId 模型ID
   * @private
   */
  private async createDefaultAssistant(
    providerId: string,
    modelId: string
  ): Promise<void> {
    try {
      // 创建编程助手
      await this.createAssistant({
        name: "通用助手",
        description: "可以回答各种问题的AI助手",
        providerId: providerId,
        modelId: modelId,
        systemPrompt: "你是一个有用的AI助手，可以回答用户的各种问题。",
        temperature: 0.7,
        tags: ["通用"],
        isDefault: true,
      });
      console.log("创建默认助手成功");
    } catch (error) {
      console.error("创建默认助手失败:", error);
      throw error;
    }
  }

  /**
   * 发送包含工具调用结果的新请求
   * @param toolCallId 工具调用ID
   * @param toolResult 工具调用结果
   * @param requestMessages 原始请求消息
   * @param currentModel 当前模型信息
   * @param modelAdapter 模型适配器
   * @param onEvent 事件回调函数
   * @private
   */
  private async sendNewRequestWithToolResult(
    toolCallId: string,
    toolResult: any,
    requestMessages: any[],
    currentModel: { provider: AiModelProvider; model: AiModel },
    modelAdapter: IModelAdapter,
    onEvent: (event: StreamEvent) => void
  ): Promise<Response> {
    if (!this.toolCallContext) {
      throw new Error("工具调用上下文未初始化");
    }

    const messageId = this.toolCallContext.getMessageId();
    const toolCall = this.toolCallContext.getToolCall(toolCallId);

    if (!toolCall) {
      throw new Error(`未找到工具调用记录: ${toolCallId}`);
    }

    try {
      // 1. 格式化工具调用结果
      const formattedResults = modelAdapter.formatToolCallResult(
        toolCall.name,
        toolCallId,
        toolCall.args || {},
        toolResult
      );

      // 2. 构建新的消息列表
      const newMessages = [...requestMessages, ...formattedResults];

      // 3. 构建新的请求体
      const requestBody = modelAdapter.buildRequestBody(
        newMessages,
        this.modelResponseContexts.get(messageId) ??
          new ModelResponseContext(messageId),
        currentModel.provider,
        currentModel.model
      );

      // 4. 发送等待事件
      onEvent(StreamEventFactory.createModelResponseWaiting(messageId));

      // 5. 发送请求并返回响应
      const response = await fetch(
        `${currentModel.provider.apiUrl}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentModel.provider.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `请求失败: ${response.status}`
        );
      }

      return response;
    } catch (error) {
      console.error("发送工具调用结果时出错:", error);
      onEvent(StreamEventFactory.createSessionError(messageId, error as Error));
      throw error;
    }
  }

  // 获取特定消息的模型响应上下文
  getModelResponseContext(messageId: string): ModelResponseContext | null {
    return this.modelResponseContexts.get(messageId) || null;
  }

  // 获取话题中所有消息的响应上下文
  async getTopicResponseContexts(
    topicId: string
  ): Promise<Map<string, ModelResponseContext>> {
    const messages = await this.getMessages(topicId);
    const result = new Map<string, ModelResponseContext>();

    for (const message of messages) {
      const context = this.modelResponseContexts.get(message.id);
      if (context) {
        result.set(message.id, context);
      }
    }

    return result;
  }

  // 导出响应上下文为JSON
  exportModelResponseContext(messageId: string): string | null {
    const context = this.modelResponseContexts.get(messageId);
    if (!context) return null;

    return JSON.stringify(context.toJSON());
  }

  // 从JSON导入响应上下文
  importModelResponseContext(json: string): ModelResponseContext | null {
    try {
      const data = JSON.parse(json);
      if (!data.messageId) return null;

      const context = ModelResponseContext.fromJSON(data);
      this.modelResponseContexts.set(data.messageId, context);
      return context;
    } catch (error) {
      console.error("导入响应上下文失败:", error);
      return null;
    }
  }

  // 清理过期的响应上下文
  cleanupModelResponseContexts(maxAgeInHours: number = 24): number {
    const now = new Date();
    const maxAgeMs = maxAgeInHours * 60 * 60 * 1000;
    let removed = 0;

    for (const [messageId, context] of this.modelResponseContexts.entries()) {
      const lastUpdateTime = context.getLastUpdateTime();
      if (now.getTime() - lastUpdateTime.getTime() > maxAgeMs) {
        this.modelResponseContexts.delete(messageId);
        removed++;
      }
    }

    return removed;
  }
}
