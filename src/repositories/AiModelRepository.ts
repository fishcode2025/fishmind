import { IDatabaseService } from '../services/database/interfaces';
import { IModelRepository } from './interfaces';
import { AiModel } from '../models/chat';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';
import { mapModelFromDb, mapModelToDb } from '../utils/dbMappers';

export class AiModelRepository implements IModelRepository {
  constructor(private db: IDatabaseService) {}
  
  async findById(id: string): Promise<AiModel | null> {
    try {
      const dbModel = await this.db.get<any>(
        'SELECT * FROM ai_models WHERE id = ?',
        [id]
      );
      
      return mapModelFromDb(dbModel);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find model by id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findAll(): Promise<AiModel[]> {
    try {
      const dbModels = await this.db.query<any>(
        'SELECT * FROM ai_models ORDER BY name ASC'
      );
      
      return dbModels.map(dbModel => mapModelFromDb(dbModel)).filter(Boolean) as AiModel[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to find all models: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async create(model: Omit<AiModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiModel> {
    try {
      console.log('AiModelRepository.create - 输入模型:', JSON.stringify(model, null, 2));
      console.log('AiModelRepository.create - modelId:', model.modelId);
      console.log('AiModelRepository.create - modelId 类型:', typeof model.modelId);
      
      // 检查必需字段
      if (!model.modelId) {
        throw new Error('modelId 字段不能为空，这将导致 NOT NULL 约束失败');
      }
      
      // 生成唯一 ID
      const id = crypto.randomUUID();
      
      // 创建新模型
      const now = new Date();
      const newModel: AiModel = {
        ...model,
        id,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('AiModelRepository.create - 新模型:', JSON.stringify(newModel, null, 2));
      console.log('AiModelRepository.create - 新模型 modelId:', newModel.modelId);
      console.log('AiModelRepository.create - 新模型 modelId 类型:', typeof newModel.modelId);
      
      // 映射为数据库格式
      const dbModel = mapModelToDb(newModel);
      console.log('AiModelRepository.create - 数据库模型:', JSON.stringify(dbModel, null, 2));
      console.log('AiModelRepository.create - 数据库模型 model_id:', dbModel.model_id);
      console.log('AiModelRepository.create - 数据库模型 model_id 类型:', typeof dbModel.model_id);
      
      // 插入数据库
      await this.db.execute(
        `INSERT INTO ai_models (
          id, name, provider_id, group_id, capabilities, model_id, 
          context_window, max_tokens, config, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dbModel.id,
          dbModel.name,
          dbModel.provider_id,
          dbModel.group_id,
          dbModel.capabilities,
          dbModel.model_id, // 确保这里使用的是 model_id 而不是 modelId
          dbModel.context_window,
          dbModel.max_tokens,
          dbModel.config || '{}',
          dbModel.created_at,
          dbModel.updated_at
        ]
      );
      
      console.log('AiModelRepository.create - 模型创建成功，ID:', id);
      
      // 返回创建的模型
      return newModel;
    } catch (error) {
      console.error('AiModelRepository.create - 创建模型失败:', error);
      throw new DatabaseError(
        `Failed to create model: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async update(id: string, model: Partial<AiModel>): Promise<AiModel> {
    // 获取现有模型
    const existingModel = await this.findById(id);
    if (!existingModel) {
      throw new Error(`模型不存在: ${id}`);
    }
    
    // 将接口层数据转换为数据库层数据
    const dbData = mapModelToDb(model);
    
    // 准备更新字段
    const updates: string[] = [];
    const params: any[] = [];
    
    if (dbData.name !== undefined) {
      updates.push('name = ?');
      params.push(dbData.name);
    }
    
    if (dbData.provider_id !== undefined) {
      updates.push('provider_id = ?');
      params.push(dbData.provider_id);
    }
    
    if (dbData.group_id !== undefined) {
      updates.push('group_id = ?');
      params.push(dbData.group_id);
    }
    
    if (dbData.capabilities !== undefined) {
      updates.push('capabilities = ?');
      params.push(dbData.capabilities);
    }
    
    if (dbData.model_id !== undefined) {
      updates.push('model_id = ?');
      params.push(dbData.model_id);
    }
    
    if (dbData.context_window !== undefined) {
      updates.push('context_window = ?');
      params.push(dbData.context_window);
    }
    
    if (dbData.max_tokens !== undefined) {
      updates.push('max_tokens = ?');
      params.push(dbData.max_tokens);
    }
    
    if (dbData.config !== undefined) {
      updates.push('config = ?');
      params.push(dbData.config);
    }
    
    // 添加更新时间
    const now = new Date();
    const updatedAt = now.toISOString();
    updates.push('updated_at = ?');
    params.push(updatedAt);
    
    // 添加ID参数
    params.push(id);
    
    // 执行更新
    if (updates.length > 0) {
      try {
        await this.db.execute(
          `UPDATE ai_models SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      } catch (error) {
        throw new DatabaseError(
          `Failed to update model: ${error instanceof Error ? error.message : String(error)}`,
          DatabaseErrorType.UPDATE_ERROR
        );
      }
    }
    
    // 返回更新后的模型
    return {
      ...existingModel,
      ...model,
      updatedAt: now
    };
  }
  
  async delete(id: string): Promise<void> {
    try {
      await this.db.execute(
        'DELETE FROM ai_models WHERE id = ?',
        [id]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete model: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.DELETE_ERROR
      );
    }
  }
  
  async count(): Promise<number> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM ai_models'
      );
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count models: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByProviderId(providerId: string): Promise<AiModel[]> {
    try {
      const dbModels = await this.db.query<any>(
        'SELECT * FROM ai_models WHERE provider_id = ? ORDER BY name ASC',
        [providerId]
      );
      
      return dbModels.map(dbModel => mapModelFromDb(dbModel)).filter(Boolean) as AiModel[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to find models by provider id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByGroupId(groupId: string): Promise<AiModel[]> {
    try {
      const dbModels = await this.db.query<any>(
        'SELECT * FROM ai_models WHERE group_id = ? ORDER BY name ASC',
        [groupId]
      );
      
      return dbModels.map(dbModel => mapModelFromDb(dbModel)).filter(Boolean) as AiModel[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to find models by group id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByCapability(capability: string): Promise<AiModel[]> {
    try {
      const dbModels = await this.db.query<any>(
        "SELECT * FROM ai_models WHERE capabilities LIKE ? ORDER BY name ASC",
        [`%${capability}%`]
      );
      
      return dbModels
        .map(dbModel => mapModelFromDb(dbModel))
        .filter((model): model is AiModel => model !== null)
        .filter(model => model.capabilities.includes(capability));
    } catch (error) {
      throw new DatabaseError(
        `Failed to find models by capability: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
}
