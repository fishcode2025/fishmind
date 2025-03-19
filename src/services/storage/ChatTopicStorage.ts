import { v4 as uuidv4 } from "uuid";
import { query, execute } from "../../lib/tauri/db";
import { writeFile } from "../../lib/tauri/fs";
import {
  ChatTopic,
  CreateTopicParams,
  UpdateTopicParams,
  StorageError,
  StorageErrorType,
} from "./types";
import { configService } from "../system/ConfigService";

/**
 * 辅助函数：处理错误消息
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 话题存储服务
 * 负责管理聊天话题的存储和检索
 */
export class ChatTopicStorage {
  private static instance: ChatTopicStorage;
  private initialized: boolean = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ChatTopicStorage {
    if (!ChatTopicStorage.instance) {
      ChatTopicStorage.instance = new ChatTopicStorage();
    }
    return ChatTopicStorage.instance;
  }

  /**
   * 初始化数据库表
   */
  private async initializeDatabase(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log("初始化数据库表...");

      // 创建话题表
      await execute(`
        CREATE TABLE IF NOT EXISTS chat_topics (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_model_id TEXT NOT NULL,
          last_provider_id TEXT NOT NULL,
          message_count INTEGER NOT NULL DEFAULT 0,
          preview TEXT
        )
      `);

      // 创建索引
      await execute(`
        CREATE INDEX IF NOT EXISTS idx_chat_topics_updated_at 
        ON chat_topics(updated_at)
      `);

      this.initialized = true;
      console.log("数据库表初始化完成");
    } catch (error) {
      console.error("初始化数据库表失败:", error);
      throw new StorageError(
        `Failed to initialize database: ${getErrorMessage(error)}`,
        StorageErrorType.DATABASE_ERROR
      );
    }
  }

  /**
   * 创建新话题
   */
  public async createTopic(params: CreateTopicParams): Promise<ChatTopic> {
    try {
      // 确保数据库表已初始化
      await this.initializeDatabase();

      const now = new Date().toISOString();
      const topicId = uuidv4();

      // 准备话题数据
      const topic: ChatTopic = {
        id: topicId,
        title: params.title,
        createdAt: now,
        updatedAt: now,
        lastModelId: params.modelId,
        lastProviderId: params.providerId,
        messageCount: 0,
        preview: params.initialMessage?.substring(0, 100) || "",
      };

      // 插入到数据库
      await execute(
        `INSERT INTO chat_topics (
          id, title, created_at, updated_at, 
          last_model_id, last_provider_id, message_count, preview
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          topic.id,
          topic.title,
          topic.createdAt,
          topic.updatedAt,
          topic.lastModelId,
          topic.lastProviderId,
          topic.messageCount,
          topic.preview,
        ]
      );

      // 创建空的聊天内容文件
      const initialContent = JSON.stringify({ messages: [] }, null, 2);
      await writeFile(
        `${configService.getAppChatsData()}/${topicId}.json`,
        initialContent
      );

      return topic;
    } catch (error: unknown) {
      console.error("Failed to create topic", error);
      const errorMessage = getErrorMessage(error);
      throw new StorageError(
        `Failed to create topic: ${errorMessage}`,
        StorageErrorType.DATABASE_ERROR
      );
    }
  }

  /**
   * 获取话题列表
   */
  public async getTopics(
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatTopic[]> {
    try {
      const results = await query<any>(
        `SELECT 
          id,
          title,
          created_at as createdAt,
          updated_at as updatedAt,
          last_model_id as lastModelId,
          last_provider_id as lastProviderId,
          message_count as messageCount,
          preview
         FROM chat_topics 
         ORDER BY updated_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return results.map((row) => ({
        id: row.id,
        title: row.title,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastModelId: row.lastModelId,
        lastProviderId: row.lastProviderId,
        messageCount: row.messageCount,
        preview: row.preview,
      }));
    } catch (error: unknown) {
      console.error("Failed to get topics", error);
      const errorMessage = getErrorMessage(error);
      throw new StorageError(
        `Failed to get topics: ${errorMessage}`,
        StorageErrorType.DATABASE_ERROR
      );
    }
  }

  /**
   * 获取话题总数
   */
  public async getTopicCount(): Promise<number> {
    try {
      const result = await query<{ count: number }>(
        "SELECT COUNT(*) as count FROM chat_topics"
      );
      return result[0].count;
    } catch (error: unknown) {
      console.error("Failed to get topic count", error);
      const errorMessage = getErrorMessage(error);
      throw new StorageError(
        `Failed to get topic count: ${errorMessage}`,
        StorageErrorType.DATABASE_ERROR
      );
    }
  }

  /**
   * 获取单个话题
   */
  public async getTopic(id: string): Promise<ChatTopic> {
    try {
      const topics = await query<ChatTopic>(
        "SELECT * FROM chat_topics WHERE id = ?",
        [id]
      );

      if (topics.length === 0) {
        throw new StorageError(
          `Topic not found: ${id}`,
          StorageErrorType.NOT_FOUND
        );
      }

      return topics[0];
    } catch (error: unknown) {
      if (error instanceof StorageError) {
        throw error;
      }

      console.error(`Failed to get topic: ${id}`, error);
      const errorMessage = getErrorMessage(error);
      throw new StorageError(
        `Failed to get topic: ${errorMessage}`,
        StorageErrorType.DATABASE_ERROR
      );
    }
  }

  /**
   * 更新话题
   */
  public async updateTopic(
    id: string,
    params: UpdateTopicParams
  ): Promise<ChatTopic> {
    try {
      // 检查话题是否存在
      const topic = await this.getTopic(id);

      // 准备更新数据
      const updates: string[] = [];
      const values: any[] = [];

      if (params.title !== undefined) {
        updates.push("title = ?");
        values.push(params.title);
      }

      if (params.lastModelId !== undefined) {
        updates.push("last_model_id = ?");
        values.push(params.lastModelId);
      }

      if (params.lastProviderId !== undefined) {
        updates.push("last_provider_id = ?");
        values.push(params.lastProviderId);
      }

      // 总是更新updated_at
      updates.push("updated_at = ?");
      const now = new Date().toISOString();
      values.push(now);

      // 添加ID作为WHERE条件
      values.push(id);

      // 执行更新
      await execute(
        `UPDATE chat_topics SET ${updates.join(", ")} WHERE id = ?`,
        values
      );

      // 返回更新后的话题
      return await this.getTopic(id);
    } catch (error: unknown) {
      if (error instanceof StorageError) {
        throw error;
      }

      console.error(`Failed to update topic: ${id}`, error);
      const errorMessage = getErrorMessage(error);
      throw new StorageError(
        `Failed to update topic: ${errorMessage}`,
        StorageErrorType.DATABASE_ERROR
      );
    }
  }

  /**
   * 增加话题的消息计数
   */
  public async incrementMessageCount(id: string): Promise<void> {
    try {
      await execute(
        "UPDATE chat_topics SET message_count = message_count + 1, updated_at = ? WHERE id = ?",
        [new Date().toISOString(), id]
      );
    } catch (error: unknown) {
      console.error(
        `Failed to increment message count for topic: ${id}`,
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new StorageError(
        `Failed to increment message count: ${errorMessage}`,
        StorageErrorType.DATABASE_ERROR
      );
    }
  }

  /**
   * 更新话题预览
   */
  public async updatePreview(id: string, preview: string): Promise<void> {
    try {
      await execute("UPDATE chat_topics SET preview = ? WHERE id = ?", [
        preview.substring(0, 100),
        id,
      ]);
    } catch (error: unknown) {
      console.error(`Failed to update preview for topic: ${id}`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new StorageError(
        `Failed to update preview: ${errorMessage}`,
        StorageErrorType.DATABASE_ERROR
      );
    }
  }
}

// 导出单例实例
export const chatTopicStorage = ChatTopicStorage.getInstance();
