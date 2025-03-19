import { IDatabaseService } from '../services/database/interfaces';
import { IConfigRepository } from './interfaces';
import { Config, ConfigMetadata, ConfigChangeEvent, ConfigValueType } from '../models/config';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';

/**
 * 配置存储库实现
 * 提供配置的存储和检索功能
 */
export class ConfigRepository implements IConfigRepository {
  /**
   * 配置变更监听器
   * key: 配置键, value: 回调函数集合
   */
  private listeners: Map<string, Set<(value: string, oldValue: string | null) => void>> = new Map();
  
  /**
   * 构造函数
   * @param db 数据库服务
   */
  constructor(private db: IDatabaseService) {}
  
  /**
   * 根据键查找配置
   * @param key 配置键
   * @returns 找到的配置或null
   */
  async findById(key: string): Promise<Config | null> {
    try {
      const result = await this.db.get<{
        key: string;
        value: string;
        updated_at: string;
        group_name: string | null;
        description: string | null;
      }>(
        'SELECT key, value, updated_at, group_name, description FROM configs WHERE key = ?',
        [key]
      );
      
      if (!result) {
        return null;
      }
      
      // 将数据库字段名映射到接口属性名
      return {
        key: result.key,
        value: result.value,
        updatedAt: result.updated_at,
        groupName: result.group_name || undefined,
        description: result.description || undefined
      };
    } catch (error: unknown) {
      throw new DatabaseError(
        `查找配置失败: ${(error as Error).message}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  /**
   * 查找所有配置
   * @returns 配置列表
   */
  async findAll(): Promise<Config[]> {
    try {
      const results = await this.db.query<{
        key: string;
        value: string;
        updated_at: string;
        group_name: string | null;
        description: string | null;
      }>(
        'SELECT key, value, updated_at, group_name, description FROM configs ORDER BY key'
      );
      
      // 将数据库字段名映射到接口属性名
      return results.map(result => ({
        key: result.key,
        value: result.value,
        updatedAt: result.updated_at,
        groupName: result.group_name || undefined,
        description: result.description || undefined
      }));
    } catch (error: unknown) {
      throw new DatabaseError(
        `查找所有配置失败: ${(error as Error).message}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  /**
   * 创建新配置
   * @param config 要创建的配置（包含键）
   * @returns 创建后的配置
   */
  async create(config: Omit<Config, 'key'> & { key: string }): Promise<Config> {
    if (!config.key) {
      throw new DatabaseError(
        '创建配置失败: 缺少键',
        DatabaseErrorType.VALIDATION_ERROR
      );
    }
    
    try {
      const now = new Date().toISOString();
      const newConfig: Config = {
        key: config.key,
        value: config.value,
        updatedAt: now,
        groupName: config.groupName,
        description: config.description
      };
      
      await this.db.execute(
        `INSERT INTO configs (key, value, updated_at, group_name, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          newConfig.key,
          newConfig.value,
          newConfig.updatedAt,
          newConfig.groupName || null,
          newConfig.description || null
        ]
      );
      
      return newConfig;
    } catch (error: unknown) {
      throw new DatabaseError(
        `创建配置失败: ${(error as Error).message}`,
        DatabaseErrorType.INSERT_ERROR
      );
    }
  }
  
  /**
   * 更新配置
   * @param key 配置键
   * @param config 要更新的配置字段
   * @returns 更新后的配置
   */
  async update(key: string, config: Partial<Config>): Promise<Config> {
    try {
      // 获取现有配置
      const existingConfig = await this.findById(key);
      if (!existingConfig) {
        throw new DatabaseError(
          `更新配置失败: 配置不存在 (${key})`,
          DatabaseErrorType.NOT_FOUND
        );
      }
      
      // 准备更新数据
      const now = new Date().toISOString();
      const updatedConfig: Config = {
        ...existingConfig,
        ...config,
        key, // 确保键不变
        updatedAt: now
      };
      
      // 构建更新SQL
      const updates: string[] = [];
      const params: any[] = [];
      
      if (config.value !== undefined) {
        updates.push('value = ?');
        params.push(config.value);
      }
      
      if (config.groupName !== undefined) {
        updates.push('group_name = ?');
        params.push(config.groupName);
      }
      
      if (config.description !== undefined) {
        updates.push('description = ?');
        params.push(config.description);
      }
      
      updates.push('updated_at = ?');
      params.push(now);
      
      // 添加键作为WHERE条件
      params.push(key);
      
      // 执行更新
      if (updates.length > 0) {
        await this.db.execute(
          `UPDATE configs SET ${updates.join(', ')} WHERE key = ?`,
          params
        );
      }
      
      return updatedConfig;
    } catch (error: unknown) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(
        `更新配置失败: ${(error as Error).message}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
  
  /**
   * 删除配置
   * @param key 配置键
   */
  async delete(key: string): Promise<void> {
    try {
      await this.db.execute(
        'DELETE FROM configs WHERE key = ?',
        [key]
      );
    } catch (error: unknown) {
      throw new DatabaseError(
        `删除配置失败: ${(error as Error).message}`,
        DatabaseErrorType.DELETE_ERROR
      );
    }
  }
  
  /**
   * 计算配置总数
   * @returns 配置总数
   */
  async count(): Promise<number> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM configs'
      );
      
      return result?.count || 0;
    } catch (error: unknown) {
      throw new DatabaseError(
        `计算配置总数失败: ${(error as Error).message}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  /**
   * 获取配置值
   * @param key 配置键
   * @returns 配置值或null
   */
  async getValue(key: string): Promise<string | null> {
    try {
      const config = await this.findById(key);
      return config?.value || null;
    } catch (error: unknown) {
      throw new DatabaseError(
        `获取配置值失败: ${(error as Error).message}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   * @returns 更新后的配置
   */
  async setValue(key: string, value: string): Promise<Config> {
    try {
      console.log(`开始设置配置 ${key} 的值为 ${value}`);
      
      // 获取旧值（用于通知监听器）
      const oldValue = await this.getValue(key);
      console.log(`配置 ${key} 的旧值为: ${oldValue}`);
      
      // 检查配置是否存在
      const existingConfig = await this.findById(key);
      console.log(`配置 ${key} ${existingConfig ? '已存在' : '不存在'}`);
      
      let result: Config;
      if (existingConfig) {
        // 如果存在，则更新
        console.log(`更新配置 ${key}`);
        result = await this.update(key, { value });
      } else {
        // 如果不存在，则创建
        console.log(`创建配置 ${key}`);
        result = await this.create({
          key,
          value,
          updatedAt: new Date().toISOString()
        });
      }
      
      // 记录变更事件
      console.log(`记录配置 ${key} 的变更事件`);
      try {
        await this.logChangeEvent({
          key,
          oldValue: oldValue || '',
          newValue: value
        });
        console.log(`变更事件记录成功`);
      } catch (eventError) {
        console.error(`记录变更事件失败:`, eventError);
        // 继续执行，不要因为记录事件失败而中断整个操作
      }
      
      // 通知监听器
      console.log(`通知配置 ${key} 的监听器`);
      this.notifyListeners(key, value, oldValue);
      
      console.log(`配置 ${key} 设置完成`);
      return result;
    } catch (error: unknown) {
      console.error(`设置配置 ${key} 失败:`, error);
      
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(
        `设置配置值失败: ${(error as Error).message}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
  
  /**
   * 根据分组获取配置
   * @param group 配置分组
   * @returns 该分组下的所有配置
   */
  async findByGroup(group: string): Promise<Config[]> {
    try {
      const results = await this.db.query<{
        key: string;
        value: string;
        updated_at: string;
        group_name: string | null;
        description: string | null;
      }>(
        'SELECT key, value, updated_at, group_name, description FROM configs WHERE group_name = ? ORDER BY key',
        [group]
      );
      
      // 将数据库字段名映射到接口属性名
      return results.map(result => ({
        key: result.key,
        value: result.value,
        updatedAt: result.updated_at,
        groupName: result.group_name || undefined,
        description: result.description || undefined
      }));
    } catch (error: unknown) {
      throw new DatabaseError(
        `根据分组获取配置失败: ${(error as Error).message}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  /**
   * 批量设置配置
   * @param configs 配置键值对
   * @returns 更新后的配置列表
   */
  async setValues(configs: Record<string, string>): Promise<Config[]> {
    try {
      const results: Config[] = [];
      
      // 使用事务确保原子性
      await this.db.transaction(async () => {
        for (const [key, value] of Object.entries(configs)) {
          const config = await this.setValue(key, value);
          results.push(config);
        }
      });
      
      return results;
    } catch (error: unknown) {
      throw new DatabaseError(
        `批量设置配置失败: ${(error as Error).message}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
  
  /**
   * 获取配置元数据
   * @param key 配置键
   * @returns 配置元数据或null
   */
  async getMetadata(key: string): Promise<ConfigMetadata | null> {
    try {
      const result = await this.db.get<{
        key: string;
        name: string;
        description: string;
        group_name: string;
        type: string;
        default_value: string;
        is_system: number;
        display_order: number;
        validation_rules: string | null;
      }>(
        'SELECT key, name, description, group_name, type, default_value, is_system, display_order, validation_rules FROM config_metadata WHERE key = ?',
        [key]
      );
      
      if (!result) {
        return null;
      }
      
      // 将数据库字段名映射到接口属性名
      return {
        key: result.key,
        name: result.name,
        description: result.description,
        groupName: result.group_name,
        type: result.type as ConfigValueType,
        defaultValue: result.default_value,
        isSystem: result.is_system === 1,
        displayOrder: result.display_order,
        validationRules: result.validation_rules || undefined
      };
    } catch (error: unknown) {
      throw new DatabaseError(
        `获取配置元数据失败: ${(error as Error).message}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  /**
   * 设置配置元数据
   * @param metadata 配置元数据
   * @returns 更新后的配置元数据
   */
  async setMetadata(metadata: ConfigMetadata): Promise<ConfigMetadata> {
    try {
      // 检查元数据是否存在
      const existingMetadata = await this.getMetadata(metadata.key);
      
      if (existingMetadata) {
        // 如果存在，则更新
        await this.db.execute(
          `UPDATE config_metadata SET 
           name = ?, 
           description = ?, 
           group_name = ?, 
           type = ?, 
           default_value = ?, 
           is_system = ?, 
           display_order = ?, 
           validation_rules = ? 
           WHERE key = ?`,
          [
            metadata.name,
            metadata.description,
            metadata.groupName,
            metadata.type,
            metadata.defaultValue,
            metadata.isSystem ? 1 : 0,
            metadata.displayOrder,
            metadata.validationRules || null,
            metadata.key
          ]
        );
      } else {
        // 如果不存在，则创建
        await this.db.execute(
          `INSERT INTO config_metadata 
           (key, name, description, group_name, type, default_value, is_system, display_order, validation_rules) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            metadata.key,
            metadata.name,
            metadata.description,
            metadata.groupName,
            metadata.type,
            metadata.defaultValue,
            metadata.isSystem ? 1 : 0,
            metadata.displayOrder,
            metadata.validationRules || null
          ]
        );
      }
      
      return metadata;
    } catch (error: unknown) {
      throw new DatabaseError(
        `设置配置元数据失败: ${(error as Error).message}`,
        DatabaseErrorType.UPDATE_ERROR
      );
    }
  }
  
  /**
   * 获取所有配置元数据
   * @returns 所有配置元数据
   */
  async getAllMetadata(): Promise<ConfigMetadata[]> {
    try {
      const results = await this.db.query<{
        key: string;
        name: string;
        description: string;
        group_name: string;
        type: string;
        default_value: string;
        is_system: number;
        display_order: number;
        validation_rules: string | null;
      }>(
        'SELECT key, name, description, group_name, type, default_value, is_system, display_order, validation_rules FROM config_metadata ORDER BY group_name, display_order, key'
      );
      
      // 将数据库字段名映射到接口属性名
      return results.map(result => ({
        key: result.key,
        name: result.name,
        description: result.description,
        groupName: result.group_name,
        type: result.type as ConfigValueType,
        defaultValue: result.default_value,
        isSystem: result.is_system === 1,
        displayOrder: result.display_order,
        validationRules: result.validation_rules || undefined
      }));
    } catch (error: unknown) {
      throw new DatabaseError(
        `获取所有配置元数据失败: ${(error as Error).message}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  /**
   * 根据分组获取配置元数据
   * @param group 配置分组
   * @returns 该分组下的所有配置元数据
   */
  async getMetadataByGroup(group: string): Promise<ConfigMetadata[]> {
    try {
      const results = await this.db.query<{
        key: string;
        name: string;
        description: string;
        group_name: string;
        type: string;
        default_value: string;
        is_system: number;
        display_order: number;
        validation_rules: string | null;
      }>(
        'SELECT key, name, description, group_name, type, default_value, is_system, display_order, validation_rules FROM config_metadata WHERE group_name = ? ORDER BY display_order, key',
        [group]
      );
      
      // 将数据库字段名映射到接口属性名
      return results.map(result => ({
        key: result.key,
        name: result.name,
        description: result.description,
        groupName: result.group_name,
        type: result.type as ConfigValueType,
        defaultValue: result.default_value,
        isSystem: result.is_system === 1,
        displayOrder: result.display_order,
        validationRules: result.validation_rules || undefined
      }));
    } catch (error: unknown) {
      throw new DatabaseError(
        `根据分组获取配置元数据失败: ${(error as Error).message}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  /**
   * 记录配置变更事件
   * @param event 配置变更事件
   * @returns 记录的配置变更事件
   */
  async logChangeEvent(event: Omit<ConfigChangeEvent, 'id' | 'timestamp'>): Promise<ConfigChangeEvent> {
    try {
      console.log('开始记录配置变更事件:', event);
      
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const fullEvent: ConfigChangeEvent = {
        id,
        timestamp,
        ...event
      };
      
      console.log('完整的变更事件对象:', fullEvent);
      
      const sql = `INSERT INTO config_change_events 
         (id, key, old_value, new_value, timestamp, reason) 
         VALUES (?, ?, ?, ?, ?, ?)`;
      
      const params = [
        fullEvent.id,
        fullEvent.key,
        fullEvent.oldValue,
        fullEvent.newValue,
        fullEvent.timestamp,
        fullEvent.reason || null
      ];
      
      console.log('执行 SQL:', sql);
      console.log('SQL 参数:', params);
      
      await this.db.execute(sql, params);
      
      console.log('变更事件记录成功');
      return fullEvent;
    } catch (error: unknown) {
      console.error('记录配置变更事件失败:', error);
      throw new DatabaseError(
        `记录配置变更事件失败: ${(error as Error).message}`,
        DatabaseErrorType.INSERT_ERROR
      );
    }
  }
  
  /**
   * 获取配置变更历史
   * @param key 配置键
   * @param limit 限制数量
   * @returns 配置变更历史
   */
  async getChangeHistory(key: string, limit?: number): Promise<ConfigChangeEvent[]> {
    try {
      console.log(`开始获取配置 ${key} 的变更历史, 限制: ${limit || '无'}`);
      
      let sql = 'SELECT id, key, old_value, new_value, timestamp, reason FROM config_change_events WHERE key = ? ORDER BY timestamp DESC';
      const params: any[] = [key];
      
      if (limit !== undefined && limit > 0) {
        sql += ' LIMIT ?';
        params.push(limit);
      }
      
      console.log('执行 SQL:', sql);
      console.log('SQL 参数:', params);
      
      let results: any[] = [];
      
      try {
        results = await this.db.query(sql, params);
      } catch (queryError) {
        console.error('查询变更历史失败:', queryError);
        // 返回空数组而不是抛出异常
        return [];
      }
      
      console.log(`查询到 ${results.length} 条变更记录`);
      if (results.length > 0) {
        console.log('第一条记录:', results[0]);
      } else {
        console.log('没有找到变更记录');
      }
      
      // 将数据库字段名映射到接口属性名
      const mappedResults: ConfigChangeEvent[] = results.map(record => ({
        id: record.id,
        key: record.key,
        oldValue: record.old_value,
        newValue: record.new_value,
        timestamp: record.timestamp,
        reason: record.reason
      }));
      
      console.log('映射后的结果:', mappedResults);
      
      return mappedResults;
    } catch (error: unknown) {
      console.error('获取配置变更历史失败:', error);
      // 返回空数组而不是抛出异常
      return [];
    }
  }
  
  /**
   * 获取类型安全的配置值
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 类型安全的配置值或默认值
   */
  async getTypedValue<T>(key: string, defaultValue: T): Promise<T> {
    const value = await this.getValue(key);
    if (value === null) return defaultValue;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(`配置值 "${key}" 不是有效的 JSON，返回默认值`, error);
      return defaultValue;
    }
  }
  
  /**
   * 设置类型安全的配置值
   * @param key 配置键
   * @param value 类型安全的值
   * @returns 更新后的配置
   */
  async setTypedValue<T>(key: string, value: T): Promise<Config> {
    return this.setValue(key, JSON.stringify(value));
  }
  
  /**
   * 添加配置变更监听器
   * @param key 配置键
   * @param callback 回调函数
   */
  addListener(key: string, callback: (value: string, oldValue: string | null) => void): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
  }
  
  /**
   * 移除配置变更监听器
   * @param key 配置键
   * @param callback 回调函数
   */
  removeListener(key: string, callback: (value: string, oldValue: string | null) => void): void {
    if (this.listeners.has(key)) {
      this.listeners.get(key)!.delete(callback);
      // 如果没有监听器了，删除该键的集合
      if (this.listeners.get(key)!.size === 0) {
        this.listeners.delete(key);
      }
    }
  }
  
  /**
   * 通知配置变更监听器
   * @param key 配置键
   * @param value 新值
   * @param oldValue 旧值
   */
  private notifyListeners(key: string, value: string, oldValue: string | null): void {
    if (this.listeners.has(key)) {
      for (const callback of this.listeners.get(key)!) {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error(`配置监听器回调执行失败: ${(error as Error).message}`);
        }
      }
    }
    
    // 通知通配符监听器（监听所有配置变更）
    if (this.listeners.has('*')) {
      for (const callback of this.listeners.get('*')!) {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error(`配置监听器回调执行失败: ${(error as Error).message}`);
        }
      }
    }
  }
  
  /**
   * 迁移配置
   * @param fromVersion 源版本
   * @param toVersion 目标版本
   */
  async migrateConfigs(fromVersion: string, toVersion: string): Promise<void> {
    try {
      console.log(`开始迁移配置: ${fromVersion} -> ${toVersion}`);
      
      // 记录迁移开始
      await this.logChangeEvent({
        key: 'system.config.migration',
        oldValue: fromVersion,
        newValue: toVersion,
        reason: '配置迁移开始'
      });
      
      // 使用事务确保迁移的原子性
      await this.db.transaction(async () => {
        // 根据版本执行不同的迁移逻辑
        if (this.compareVersions(fromVersion, '1.0.0') < 0 && this.compareVersions(toVersion, '1.0.0') >= 0) {
          await this.migrateToV1_0_0();
        }
        
        if (this.compareVersions(fromVersion, '1.1.0') < 0 && this.compareVersions(toVersion, '1.1.0') >= 0) {
          await this.migrateToV1_1_0();
        }
        
        // 可以添加更多版本的迁移逻辑
        
        // 更新版本号
        await this.setValue('system.config.version', toVersion);
      });
      
      // 记录迁移完成
      await this.logChangeEvent({
        key: 'system.config.migration',
        oldValue: fromVersion,
        newValue: toVersion,
        reason: '配置迁移完成'
      });
      
      console.log(`配置迁移完成: ${fromVersion} -> ${toVersion}`);
    } catch (error: unknown) {
      // 记录迁移失败
      await this.logChangeEvent({
        key: 'system.config.migration',
        oldValue: fromVersion,
        newValue: toVersion,
        reason: `配置迁移失败: ${(error as Error).message}`
      });
      
      throw new DatabaseError(
        `配置迁移失败: ${(error as Error).message}`,
        DatabaseErrorType.MIGRATION_ERROR
      );
    }
  }
  
  /**
   * 迁移到 v1.0.0
   * 示例迁移函数，实际实现根据需求调整
   */
  private async migrateToV1_0_0(): Promise<void> {
    console.log('执行迁移到 v1.0.0 的逻辑');
    
    // 示例：重命名配置键
    const oldTheme = await this.getValue('theme');
    if (oldTheme !== null) {
      await this.setValue('app.theme', oldTheme);
      await this.delete('theme');
    }
    
    // 示例：设置默认值
    if (await this.getValue('app.language') === null) {
      await this.setValue('app.language', 'zh-CN');
    }
  }
  
  /**
   * 迁移到 v1.1.0
   * 示例迁移函数，实际实现根据需求调整
   */
  private async migrateToV1_1_0(): Promise<void> {
    console.log('执行迁移到 v1.1.0 的逻辑');
    
    // 示例：更新配置结构
    const theme = await this.getValue('app.theme');
    if (theme !== null) {
      // 假设 v1.1.0 引入了主题对象，包含更多属性
      const themeObj = {
        name: theme,
        dark: theme === 'dark',
        colors: {
          primary: theme === 'dark' ? '#90caf9' : '#1976d2',
          secondary: theme === 'dark' ? '#f48fb1' : '#dc004e'
        }
      };
      
      await this.setTypedValue('app.theme', themeObj);
    }
  }
  
  /**
   * 比较版本号
   * @param v1 版本1
   * @param v2 版本2
   * @returns 比较结果：-1表示v1<v2，0表示v1=v2，1表示v1>v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = i < parts1.length ? parts1[i] : 0;
      const part2 = i < parts2.length ? parts2[i] : 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }
} 