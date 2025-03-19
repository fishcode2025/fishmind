// src/repositories/MessageRepository.ts
import { IDatabaseService } from '../services/database/interfaces';
import { IMessageRepository } from './interfaces';
import { Message } from '../models/chat';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';
import { mapMessageFromDb, mapMessageToDb } from '../utils/dbMappers';

export class ChatMessageRepository implements IMessageRepository {
  constructor(private db: IDatabaseService) {}
  
  async findById(id: string): Promise<Message | null> {
    try {
      const dbMessage = await this.db.get<any>(
        'SELECT * FROM messages WHERE id = ?',
        [id]
      );
      
      return mapMessageFromDb(dbMessage);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find message by id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findAll(): Promise<Message[]> {
    try {
      const dbMessages = await this.db.query<any[]>(
        'SELECT * FROM messages ORDER BY timestamp DESC'
      );
      
      return dbMessages.map((dbMessage: any) => mapMessageFromDb(dbMessage)).filter((message): message is Message => message !== null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find all messages: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async create(message: Omit<Message, 'id'>): Promise<Message> {
    try {
      const id = crypto.randomUUID();
      
      const newMessage: Message = {
        id,
        ...message
      };
      
      console.log('创建消息，数据:', newMessage);
      
      const dbMessage = mapMessageToDb(newMessage);
      
      console.log('映射后的数据库消息:', dbMessage);
      
      await this.db.execute(
        `INSERT INTO messages (
          id, topic_id, role, content, timestamp, model_id, provider_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          dbMessage.id,
          dbMessage.topic_id,
          dbMessage.role,
          dbMessage.content,
          dbMessage.timestamp,
          dbMessage.model_id,
          dbMessage.provider_id
        ]
      );
      
      return newMessage;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create message: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.INSERT_ERROR
      );
    }
  }
  
  async update(id: string, message: Partial<Message>): Promise<Message> {
    try {
      console.log(`更新消息 ${id}，更新数据:`, JSON.stringify(message, null, 2));
      
      const currentMessage = await this.findById(id);
      if (!currentMessage) {
        throw new Error(`Message with id ${id} not found`);
      }
      
      console.log(`当前消息:`, JSON.stringify(currentMessage, null, 2));
      
      const updatedMessage = {
        ...currentMessage,
        ...message,
        id // 确保ID不变
      };
      
      console.log(`合并后的消息:`, JSON.stringify(updatedMessage, null, 2));
      
      // 确保 topicId 不为空
      if (!updatedMessage.topicId) {
        console.error('错误: topicId 为空，这将导致 NOT NULL 约束失败');
        if (currentMessage.topicId) {
          console.log(`使用当前消息的 topicId: ${currentMessage.topicId}`);
          updatedMessage.topicId = currentMessage.topicId;
        } else {
          throw new Error('无法更新消息: topicId 为空');
        }
      }
      
      const dbMessage = mapMessageToDb(updatedMessage);
      
      console.log('映射后的数据库消息:', dbMessage);
      
      await this.db.execute(
        `UPDATE messages SET 
          topic_id = ?, role = ?, content = ?, timestamp = ?, 
          model_id = ?, provider_id = ?
        WHERE id = ?`,
        [
          dbMessage.topic_id,
          dbMessage.role,
          dbMessage.content,
          dbMessage.timestamp,
          dbMessage.model_id,
          dbMessage.provider_id,
          id
        ]
      );
      
      console.log(`消息更新成功:`, JSON.stringify(updatedMessage, null, 2));
      
      return updatedMessage;
    } catch (error) {
      console.error(`更新消息失败:`, error);
      throw new DatabaseError(
        `Failed to update message: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
  
  async delete(id: string): Promise<void> {
    try {
      await this.db.execute(
        'DELETE FROM messages WHERE id = ?',
        [id]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.DELETE_ERROR
      );
    }
  }
  
  async count(): Promise<number> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM messages'
      );
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count messages: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByTopicId(topicId: string): Promise<Message[]> {
    try {
      const dbMessages = await this.db.query<any[]>(
        'SELECT * FROM messages WHERE topic_id = ? ORDER BY timestamp ASC',
        [topicId]
      );
      
      return dbMessages.map((dbMessage: any) => mapMessageFromDb(dbMessage)).filter((message): message is Message => message !== null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find messages by topic id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByTopicIdPaginated(topicId: string, page: number, pageSize: number): Promise<Message[]> {
    try {
      const offset = (page - 1) * pageSize;
      
      const dbMessages = await this.db.query<any[]>(
        'SELECT * FROM messages WHERE topic_id = ? ORDER BY timestamp ASC LIMIT ? OFFSET ?',
        [topicId, pageSize, offset]
      );
      
      return dbMessages.map((dbMessage: any) => mapMessageFromDb(dbMessage)).filter((message): message is Message => message !== null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find paginated messages: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findLastByTopicId(topicId: string): Promise<Message | null> {
    try {
      const dbMessage = await this.db.get<any>(
        'SELECT * FROM messages WHERE topic_id = ? ORDER BY timestamp DESC LIMIT 1',
        [topicId]
      );
      
      return mapMessageFromDb(dbMessage);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find last message: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async deleteByTopicId(topicId: string): Promise<void> {
    try {
      await this.db.execute(
        'DELETE FROM messages WHERE topic_id = ?',
        [topicId]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete messages by topic id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.DELETE_ERROR
      );
    }
  }
}