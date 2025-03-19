import { IDatabaseService } from '../services/database/interfaces';
import { IAssistantRepository } from './interfaces';
import { Assistant } from '../models/chat';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';

/**
 * 将数据库对象映射到Assistant模型
 */
function mapAssistantFromDb(dbAssistant: any): Assistant | null {
  if (!dbAssistant) return null;
  
  return {
    id: dbAssistant.id,
    name: dbAssistant.name,
    description: dbAssistant.description,
    avatar: dbAssistant.avatar,
    providerId: dbAssistant.provider_id,
    modelId: dbAssistant.model_id,
    systemPrompt: dbAssistant.system_prompt,
    temperature: dbAssistant.temperature,
    memoryStrategy: dbAssistant.memory_strategy as Assistant['memoryStrategy'],
    contextWindowSize: dbAssistant.context_window_size,
    enabledToolIds: dbAssistant.enabled_tool_ids ? JSON.parse(dbAssistant.enabled_tool_ids) : undefined,
    knowledgeBaseIds: dbAssistant.knowledge_base_ids ? JSON.parse(dbAssistant.knowledge_base_ids) : undefined,
    createdAt: dbAssistant.created_at,
    updatedAt: dbAssistant.updated_at,
    isDefault: Boolean(dbAssistant.is_default),
    tags: dbAssistant.tags ? JSON.parse(dbAssistant.tags) : undefined
  };
}

/**
 * 将Assistant模型映射到数据库对象
 */
function mapAssistantToDb(assistant: Assistant): any {
  return {
    id: assistant.id,
    name: assistant.name,
    description: assistant.description,
    avatar: assistant.avatar,
    provider_id: assistant.providerId,
    model_id: assistant.modelId,
    system_prompt: assistant.systemPrompt,
    temperature: assistant.temperature,
    memory_strategy: assistant.memoryStrategy,
    context_window_size: assistant.contextWindowSize,
    enabled_tool_ids: assistant.enabledToolIds ? JSON.stringify(assistant.enabledToolIds) : null,
    knowledge_base_ids: assistant.knowledgeBaseIds ? JSON.stringify(assistant.knowledgeBaseIds) : null,
    created_at: assistant.createdAt,
    updated_at: assistant.updatedAt,
    is_default: assistant.isDefault ? 1 : 0,
    tags: assistant.tags ? JSON.stringify(assistant.tags) : null
  };
}

export class AssistantRepository implements IAssistantRepository {
  constructor(private db: IDatabaseService) {}
  
  async findById(id: string): Promise<Assistant | null> {
    try {
      const dbAssistant = await this.db.get<any>(
        'SELECT * FROM assistants WHERE id = ?',
        [id]
      );
      
      return mapAssistantFromDb(dbAssistant);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find assistant by id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findAll(): Promise<Assistant[]> {
    try {
      const dbAssistants = await this.db.query<any[]>(
        'SELECT * FROM assistants ORDER BY name ASC'
      );
      
      return dbAssistants
        .map((dbAssistant: any) => mapAssistantFromDb(dbAssistant))
        .filter((assistant): assistant is Assistant => assistant !== null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find all assistants: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async create(assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assistant> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const newAssistant: Assistant = {
        id,
        ...assistant,
        createdAt: now,
        updatedAt: now
      };
      
      const dbAssistant = mapAssistantToDb(newAssistant);
      
      console.log('Creating assistant with data:', dbAssistant);
      
      await this.db.execute(
        `INSERT INTO assistants (
          id, name, description, avatar, provider_id, model_id, 
          system_prompt, temperature, memory_strategy, context_window_size,
          enabled_tool_ids, knowledge_base_ids, created_at, updated_at, 
          is_default, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dbAssistant.id,
          dbAssistant.name,
          dbAssistant.description,
          dbAssistant.avatar,
          dbAssistant.provider_id,
          dbAssistant.model_id,
          dbAssistant.system_prompt,
          dbAssistant.temperature,
          dbAssistant.memory_strategy,
          dbAssistant.context_window_size,
          dbAssistant.enabled_tool_ids,
          dbAssistant.knowledge_base_ids,
          dbAssistant.created_at,
          dbAssistant.updated_at,
          dbAssistant.is_default,
          dbAssistant.tags
        ]
      );
      
      // 如果设置为默认助手，则更新其他助手为非默认
      if (newAssistant.isDefault) {
        await this.updateOtherAssistantsToNonDefault(id);
      }
      
      return newAssistant;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create assistant: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.INSERT_ERROR
      );
    }
  }
  
  async update(id: string, assistant: Partial<Assistant>): Promise<Assistant> {
    try {
      const currentAssistant = await this.findById(id);
      if (!currentAssistant) {
        throw new Error(`Assistant with id ${id} not found`);
      }
      
      const updatedAssistant = {
        ...currentAssistant,
        ...assistant,
        id, // 确保ID不变
        updatedAt: new Date().toISOString()
      };
      
      const dbAssistant = mapAssistantToDb(updatedAssistant);
      
      console.log('Updating assistant with data:', dbAssistant);
      
      await this.db.execute(
        `UPDATE assistants SET 
          name = ?, description = ?, avatar = ?, provider_id = ?, 
          model_id = ?, system_prompt = ?, temperature = ?, 
          memory_strategy = ?, context_window_size = ?,
          enabled_tool_ids = ?, knowledge_base_ids = ?, 
          updated_at = ?, is_default = ?, tags = ?
        WHERE id = ?`,
        [
          dbAssistant.name,
          dbAssistant.description,
          dbAssistant.avatar,
          dbAssistant.provider_id,
          dbAssistant.model_id,
          dbAssistant.system_prompt,
          dbAssistant.temperature,
          dbAssistant.memory_strategy,
          dbAssistant.context_window_size,
          dbAssistant.enabled_tool_ids,
          dbAssistant.knowledge_base_ids,
          dbAssistant.updated_at,
          dbAssistant.is_default,
          dbAssistant.tags,
          id
        ]
      );
      
      // 如果设置为默认助手，则更新其他助手为非默认
      if (updatedAssistant.isDefault) {
        await this.updateOtherAssistantsToNonDefault(id);
      }
      
      return updatedAssistant;
    } catch (error) {
      throw new DatabaseError(
        `Failed to update assistant: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
  
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.execute(
        'DELETE FROM assistants WHERE id = ?',
        [id]
      );
      
      return true;
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete assistant: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.DELETE_ERROR
      );
    }
  }
  
  async findByName(name: string): Promise<Assistant | null> {
    try {
      const dbAssistant = await this.db.get<any>(
        'SELECT * FROM assistants WHERE name = ?',
        [name]
      );
      
      return mapAssistantFromDb(dbAssistant);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find assistant by name: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findDefault(): Promise<Assistant | null> {
    try {
      const dbAssistant = await this.db.get<any>(
        'SELECT * FROM assistants WHERE is_default = 1'
      );
      
      return mapAssistantFromDb(dbAssistant);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find default assistant: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async setDefault(id: string): Promise<boolean> {
    try {
      // 先将所有助手设为非默认
      await this.db.execute(
        'UPDATE assistants SET is_default = 0'
      );
      
      // 将指定助手设为默认
      await this.db.execute(
        'UPDATE assistants SET is_default = 1 WHERE id = ?',
        [id]
      );
      
      return true;
    } catch (error) {
      throw new DatabaseError(
        `Failed to set default assistant: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
  
  async count(): Promise<number> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM assistants'
      );
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count assistants: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  /**
   * 将除指定ID外的所有助手设置为非默认
   */
  private async updateOtherAssistantsToNonDefault(id: string): Promise<void> {
    try {
      await this.db.execute(
        'UPDATE assistants SET is_default = 0 WHERE id != ?',
        [id]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to update other assistants to non-default: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
}