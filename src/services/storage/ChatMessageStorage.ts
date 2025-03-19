import { v4 as uuidv4 } from 'uuid';
import { readFile, writeFile } from '../../lib/tauri/fs';
import { ChatTopicStorage } from './ChatTopicStorage';
import { 
  ChatMessage, 
  CreateMessageParams, 
  StorageError, 
  StorageErrorType 
} from './types';
import { execute } from '../../lib/tauri/db';
import { configService } from '../system/ConfigService';

/**
 * 消息存储服务
 * 负责管理聊天消息的存储和检索
 */
export class ChatMessageStorage {
  private static instance: ChatMessageStorage;
  private chatTopicStorage: ChatTopicStorage;
  
  private constructor() {
    this.chatTopicStorage = ChatTopicStorage.getInstance();
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): ChatMessageStorage {
    if (!ChatMessageStorage.instance) {
      ChatMessageStorage.instance = new ChatMessageStorage();
    }
    return ChatMessageStorage.instance;
  }
  
  /**
   * 获取话题的所有消息
   */
  public async getMessages(topicId: string): Promise<ChatMessage[]> {
    try {
      // 检查话题是否存在
      await this.chatTopicStorage.getTopic(topicId);
      
      // 读取聊天内容
      const filePath = `${configService.getAppChatsData()}/${topicId}.json`;
      console.log('Reading messages from:', filePath);
      const content = await readFile(filePath);
      console.log('File content:', content);
      const data = JSON.parse(content);
      console.log('Parsed data:', data);
      
      return data.messages || [];
    } catch (error: unknown) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Failed to get messages for topic: ${topicId}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(
        `Failed to get messages: ${errorMessage}`,
        StorageErrorType.FILE_SYSTEM_ERROR
      );
    }
  }
  
  /**
   * 添加新消息
   */
  public async addMessage(params: CreateMessageParams): Promise<ChatMessage> {
    try {
      console.log('Adding new message with params:', params);
      
      // 检查话题是否存在
      await this.chatTopicStorage.getTopic(params.topicId);
      
      // 创建新消息
      const message: ChatMessage = {
        id: uuidv4(),
        topicId: params.topicId,
        role: params.role,
        content: params.content,
        timestamp: new Date().toISOString(),
        modelId: params.modelId,
        providerId: params.providerId
      };
      
      console.log('Created new message:', message);
      
      // 获取现有消息
      let messages: ChatMessage[] = [];
      try {
        messages = await this.getMessages(params.topicId);
        console.log('Existing messages:', messages);
      } catch (error) {
        console.warn('Failed to get existing messages, starting with empty array:', error);
      }
      
      // 添加新消息
      messages.push(message);
      console.log('Updated messages array:', messages);
      
      // 保存更新后的消息
      const content = JSON.stringify({ messages }, null, 2);
      console.log('Content to save:', content);
      const filePath = `${configService.getAppChatsData()}/${params.topicId}.json`;
      console.log('Saving to file:', filePath);
      await writeFile(filePath, content);
      
      // 更新话题元数据
      await this.chatTopicStorage.incrementMessageCount(params.topicId);
      
      // 如果是第一条用户消息，更新预览
      if (messages.length === 1 && params.role === 'user') {
        await this.chatTopicStorage.updatePreview(params.topicId, params.content);
      }
      
      return message;
    } catch (error: unknown) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Failed to add message to topic: ${params.topicId}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(
        `Failed to add message: ${errorMessage}`,
        StorageErrorType.FILE_SYSTEM_ERROR
      );
    }
  }
  
  /**
   * 批量添加消息
   */
  public async addMessages(messages: CreateMessageParams[]): Promise<ChatMessage[]> {
    if (messages.length === 0) {
      return [];
    }
    
    // 确保所有消息属于同一个话题
    const topicId = messages[0].topicId;
    if (!messages.every(msg => msg.topicId === topicId)) {
      throw new StorageError(
        'All messages must belong to the same topic',
        StorageErrorType.VALIDATION_ERROR
      );
    }
    
    try {
      console.log('Adding multiple messages:', messages);
      
      // 检查话题是否存在
      await this.chatTopicStorage.getTopic(topicId);
      
      // 获取现有消息
      let existingMessages: ChatMessage[] = [];
      try {
        existingMessages = await this.getMessages(topicId);
        console.log('Existing messages:', existingMessages);
      } catch (error) {
        console.warn('Failed to get existing messages, starting with empty array:', error);
      }
      
      // 创建新消息
      const newMessages: ChatMessage[] = messages.map(params => ({
        id: uuidv4(),
        topicId: params.topicId,
        role: params.role,
        content: params.content,
        timestamp: new Date().toISOString(),
        modelId: params.modelId,
        providerId: params.providerId
      }));
      
      console.log('Created new messages:', newMessages);
      
      // 合并消息
      const allMessages = [...existingMessages, ...newMessages];
      console.log('All messages after merge:', allMessages);
      
      // 保存更新后的消息
      const content = JSON.stringify({ messages: allMessages }, null, 2);
      console.log('Content to save:', content);
      const filePath = `${configService.getAppChatsData()}/${topicId}.json`;
      console.log('Saving to file:', filePath);
      await writeFile(filePath, content);
      
      // 更新话题元数据
      for (let i = 0; i < newMessages.length; i++) {
        await this.chatTopicStorage.incrementMessageCount(topicId);
      }
      
      // 如果是第一条用户消息，更新预览
      if (existingMessages.length === 0 && newMessages[0].role === 'user') {
        await this.chatTopicStorage.updatePreview(topicId, newMessages[0].content);
      }
      
      return newMessages;
    } catch (error: unknown) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Failed to add messages to topic: ${topicId}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(
        `Failed to add messages: ${errorMessage}`,
        StorageErrorType.FILE_SYSTEM_ERROR
      );
    }
  }
  
  /**
   * 清空话题的所有消息
   */
  public async clearMessages(topicId: string): Promise<void> {
    try {
      // 检查话题是否存在
      await this.chatTopicStorage.getTopic(topicId);
      
      // 创建空的消息数组
      const content = JSON.stringify({ messages: [] }, null, 2);
      await writeFile(`${configService.getAppChatsData()}/${topicId}.json`, content);
      
      // 更新话题元数据
      await execute(
        'UPDATE chat_topics SET message_count = 0, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), topicId]
      );
    } catch (error: unknown) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Failed to clear messages for topic: ${topicId}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(
        `Failed to clear messages: ${errorMessage}`,
        StorageErrorType.FILE_SYSTEM_ERROR
      );
    }
  }
  
  /**
   * 获取最后一条消息
   */
  public async getLastMessage(topicId: string): Promise<ChatMessage | null> {
    try {
      const messages = await this.getMessages(topicId);
      if (messages.length === 0) {
        return null;
      }
      return messages[messages.length - 1];
    } catch (error: unknown) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Failed to get last message for topic: ${topicId}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(
        `Failed to get last message: ${errorMessage}`,
        StorageErrorType.UNKNOWN_ERROR
      );
    }
  }
  
  /**
   * 更新消息内容（用于流式响应）
   */
  public async updateMessageContent(topicId: string, messageId: string, content: string): Promise<ChatMessage> {
    try {
      // 获取所有消息
      const messages = await this.getMessages(topicId);
      
      // 查找并更新指定消息
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        throw new StorageError(
          `Message not found: ${messageId}`,
          StorageErrorType.NOT_FOUND
        );
      }
      
      // 更新消息内容
      messages[messageIndex].content = content;
      
      // 保存更新后的消息
      const updatedContent = JSON.stringify({ messages }, null, 2);
      await writeFile(`${configService.getAppChatsData()}/${topicId}.json`, updatedContent);
      
      return messages[messageIndex];
    } catch (error: unknown) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Failed to update message content: ${messageId}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(
        `Failed to update message content: ${errorMessage}`,
        StorageErrorType.FILE_SYSTEM_ERROR
      );
    }
  }
  
  /**
   * 删除最后一条消息
   * 用于撤回操作
   */
  public async deleteLastMessage(topicId: string): Promise<void> {
    try {
      // 获取所有消息
      const messages = await this.getMessages(topicId);
      
      if (messages.length === 0) {
        return; // 没有消息可删除
      }
      
      // 移除最后一条消息
      messages.pop();
      
      // 保存更新后的消息
      const content = JSON.stringify({ messages }, null, 2);
      await writeFile(`${configService.getAppChatsData()}/${topicId}.json`, content);
      
      // 更新话题元数据
      await execute(
        'UPDATE chat_topics SET message_count = message_count - 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), topicId]
      );
    } catch (error: unknown) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Failed to delete last message for topic: ${topicId}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(
        `Failed to delete last message: ${errorMessage}`,
        StorageErrorType.UNKNOWN_ERROR
      );
    }
  }
}

// 导出单例实例
export const chatMessageStorage = ChatMessageStorage.getInstance();