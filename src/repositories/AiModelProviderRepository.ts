import { IDatabaseService } from '../services/database/interfaces';
import { IProviderRepository } from './interfaces';
import { AiModelProvider } from '../models/chat';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';
import { mapProviderFromDb, mapProviderToDb } from '../utils/dbMappers';

export class AiModelProviderRepository implements IProviderRepository {
  constructor(private db: IDatabaseService) {}
  
  async findById(id: string): Promise<AiModelProvider | null> {
    try {
      const dbProvider = await this.db.get<any>(
        'SELECT * FROM ai_model_providers WHERE id = ?',
        [id]
      );
      
      return mapProviderFromDb(dbProvider);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find provider by id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findAll(): Promise<AiModelProvider[]> {
    try {
      const dbProviders = await this.db.query<any>(
        'SELECT * FROM ai_model_providers ORDER BY name ASC'
      );
      
      return dbProviders.map(dbProvider => mapProviderFromDb(dbProvider)).filter(Boolean) as AiModelProvider[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to find all providers: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async create(provider: Omit<AiModelProvider, 'createdAt' | 'updatedAt'>): Promise<AiModelProvider> {
    const now = new Date();
    
    // 使用提供的ID或生成新ID
    const id = provider.id || crypto.randomUUID();
    
    const newProvider: AiModelProvider = {
      ...provider,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    const dbProvider = mapProviderToDb(newProvider);
    
    await this.db.execute(
      `INSERT INTO ai_model_providers (
        id, name, enabled, api_key, api_url, config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dbProvider.name,
        dbProvider.enabled,
        dbProvider.api_key,
        dbProvider.api_url,
        dbProvider.config,
        dbProvider.created_at,
        dbProvider.updated_at,
      ]
    );
    
    return newProvider;
  }
  
  async update(id: string, data: Partial<AiModelProvider>): Promise<AiModelProvider> {
    // 获取现有提供商
    const provider = await this.findById(id);
    if (!provider) {
      throw new Error(`提供商不存在: ${id}`);
    }
    
    // 将接口层数据转换为数据库层数据
    const dbData = mapProviderToDb(data);
    
    // 准备更新字段
    const updates: string[] = [];
    const params: any[] = [];
    
    if (dbData.name !== undefined) {
      updates.push('name = ?');
      params.push(dbData.name);
    }
    
    if (dbData.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(dbData.enabled);
    }
    
    if (dbData.api_key !== undefined) {
      updates.push('api_key = ?');
      params.push(dbData.api_key);
    }
    
    if (dbData.api_url !== undefined) {
      updates.push('api_url = ?');
      params.push(dbData.api_url);
    }
    
    if (dbData.config !== undefined) {
      updates.push('config = ?');
      params.push(dbData.config);
    }
    
    // 添加更新时间
    const now = new Date();
    updates.push('updated_at = ?');
    params.push(now.toISOString());
    
    // 添加ID参数
    params.push(id);
    
    // 执行更新
    if (updates.length > 0) {
      await this.db.execute(
        `UPDATE ai_model_providers SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    // 返回更新后的提供商
    return {
      ...provider,
      ...data,
      updatedAt: now
    };
  }
  
  async delete(id: string): Promise<void> {
    try {
      await this.db.execute(
        'DELETE FROM ai_model_providers WHERE id = ?',
        [id]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete provider: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async count(): Promise<number> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM ai_model_providers'
      );
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count ai_model_providers: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByName(name: string): Promise<AiModelProvider | null> {
    try {
      const dbProvider = await this.db.get<any>(
        'SELECT * FROM ai_model_providers WHERE name = ?',
        [name]
      );
      
      return mapProviderFromDb(dbProvider);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find provider by name: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findEnabled(): Promise<AiModelProvider[]> {
    try {
      const dbProviders = await this.db.query<any>(
        'SELECT * FROM ai_model_providers WHERE enabled = 1 ORDER BY name ASC'
      );
      
      return dbProviders.map(dbProvider => mapProviderFromDb(dbProvider)).filter(Boolean) as AiModelProvider[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to find enabled ai_model_providers: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
}
