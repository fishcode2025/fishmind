import { IDatabaseService } from '../services/database/interfaces';
import { ITopicRepository } from './interfaces';
import { Topic } from '../models/chat';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';
import { mapTopicFromDb, mapTopicToDb } from '../utils/dbMappers';

export class ChatTopicRepository implements ITopicRepository {
  async findByAssistantId(assistantId: string): Promise<Topic[]> {
    try {
      const dbTopics = await this.db.query<any[]>(
        'SELECT * FROM topics WHERE last_model_id = ? ORDER BY updated_at DESC',
        [assistantId]
      );
      
      return dbTopics.map((dbTopic: any) => mapTopicFromDb(dbTopic)).filter((topic): topic is Topic => topic !== null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find topics by assistant id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  constructor(private db: IDatabaseService) {}
  
  async findById(id: string): Promise<Topic | null> {
    try {
      const dbTopic = await this.db.get<any>(
        'SELECT * FROM topics WHERE id = ?',
        [id]
      );
      
      return mapTopicFromDb(dbTopic);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find topic by id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findAll(): Promise<Topic[]> {
    try {
      const dbTopics = await this.db.query<any[]>(
        'SELECT * FROM topics ORDER BY updated_at DESC'
      );
      
      return dbTopics.map((dbTopic: any) => mapTopicFromDb(dbTopic)).filter((topic): topic is Topic => topic !== null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find all topics: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async create(topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Topic> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const newTopic: Topic = {
        id,
        ...topic,
        createdAt: now,
        updatedAt: now,
        messageCount: topic.messageCount || 0
      };
      
      const dbTopic = mapTopicToDb(newTopic);
      
      console.log('Creating topic with data:', dbTopic);
      
      await this.db.execute(
        `INSERT INTO topics (
          id, title, created_at, updated_at, 
          last_model_id, last_provider_id, message_count, preview,
          source_assistant_id, current_config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dbTopic.id,
          dbTopic.title,
          dbTopic.created_at,
          dbTopic.updated_at,
          dbTopic.last_model_id,
          dbTopic.last_provider_id,
          dbTopic.message_count || 0,
          dbTopic.preview || '',
          dbTopic.source_assistant_id || null,
          dbTopic.current_config ? JSON.stringify(dbTopic.current_config) : null
        ]
      );
      
      console.log(`成功创建新话题: ${id}, 标题: ${topic.title}, 助手ID: ${topic.sourceAssistantId}`);
      
      return newTopic;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create topic: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.INSERT_ERROR
      );
    }
  }
  
  async update(id: string, topic: Partial<Topic>): Promise<Topic> {
    try {
      const currentTopic = await this.findById(id);
      if (!currentTopic) {
        throw new Error(`Topic with id ${id} not found`);
      }
      
      const updatedTopic = {
        ...currentTopic,
        ...topic,
        id, // 确保ID不变
        updatedAt: new Date().toISOString()
      };
      
      const dbTopic = mapTopicToDb(updatedTopic);
      
      console.log('Updating topic with data:', dbTopic);
      
      await this.db.execute(
        `UPDATE topics SET 
          title = ?, updated_at = ?, last_model_id = ?, 
          last_provider_id = ?, message_count = ?, preview = ?
        WHERE id = ?`,
        [
          dbTopic.title,
          dbTopic.updated_at,
          dbTopic.last_model_id,
          dbTopic.last_provider_id,
          dbTopic.message_count,
          dbTopic.preview || '',
          id
        ]
      );
      
      return updatedTopic;
    } catch (error) {
      throw new DatabaseError(
        `Failed to update topic: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
  
  async delete(id: string): Promise<boolean> {
    try {
      // 执行删除操作
      let result: any;
      try {
        result = await this.db.execute(
          'DELETE FROM topics WHERE id = ?',
          [id]
        );
      } catch (dbError) {
        console.error(`数据库执行删除操作失败 (ID: ${id}):`, dbError);
        throw dbError;
      }
      
      console.log("删除话题结果:", result);
      
      // 检查result是否为undefined或null
      if (result === undefined || result === null) {
        console.warn(`删除话题时返回空结果: ${id}`);
        return false;
      }
      
      // 尝试安全地访问affectedRows
      const affectedRows = typeof result === 'object' && result !== null && 'affectedRows' in result 
        ? (result as { affectedRows: number }).affectedRows 
        : 0;
      
      // 返回是否成功删除（影响行数大于0）
      return affectedRows > 0;
    } catch (error) {
      console.error(`删除话题失败 (ID: ${id}):`, error);
      throw new DatabaseError(
        `Failed to delete topic: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.DELETE_ERROR
      );
    }
  }
  
  async count(): Promise<number> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM topics'
      );
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count topics: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByTitle(title: string): Promise<Topic[]> {
    try {
      const dbTopics = await this.db.query<any[]>(
        'SELECT * FROM topics WHERE title LIKE ? ORDER BY updated_at DESC',
        [`%${title}%`]
      );
      
      return dbTopics.map((dbTopic: any) => mapTopicFromDb(dbTopic)).filter((topic): topic is Topic => topic !== null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find topics by title: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findRecent(limit: number): Promise<Topic[]> {
    try {
      const dbTopics = await this.db.query<any[]>(
        'SELECT * FROM topics ORDER BY updated_at DESC LIMIT ?',
        [limit]
      );
      
      return dbTopics.map((dbTopic: any) => mapTopicFromDb(dbTopic)).filter((topic): topic is Topic => topic !== null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find recent topics: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async incrementMessageCount(id: string): Promise<void> {
    try {
      // 首先获取当前话题
      const currentTopic = await this.findById(id);
      if (!currentTopic) {
        throw new Error(`Topic with id ${id} not found`);
      }
      
      // 计算新的消息计数
      const newCount = currentTopic.messageCount + 1;
      const now = new Date().toISOString();
      
      console.log(`增加消息计数: ${id}, 当前计数: ${currentTopic.messageCount}, 新计数: ${newCount}`);
      
      // 更新话题
      await this.update(id, {
        messageCount: newCount,
        updatedAt: now
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to increment message count: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
  
  async updatePreview(id: string, preview: string): Promise<void> {
    try {
      await this.db.execute(
        'UPDATE topics SET preview = ?, updated_at = ? WHERE id = ?',
        [preview, new Date().toISOString(), id]
      );
      
      const updatedTopic = await this.findById(id);
      if (!updatedTopic) {
        throw new Error(`Topic with id ${id} not found after updating preview`);
      }
      
// 由于方法返回类型为void，这里不需要返回值
    } catch (error) {
      throw new DatabaseError(
        `Failed to update preview: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
}
