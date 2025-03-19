/**
 * 配置服务实现
 * 负责管理应用配置，包括数据库位置设置
 */
import { IConfigService } from '../interfaces';
import { IConfigRepository } from '../../repositories/interfaces';
import { Config, ConfigMetadata } from '../../models/config';
import { IDatabaseService } from '../database/interfaces';

/**
 * 配置服务类
 * 实现IConfigService接口
 */
export class ConfigService implements IConfigService {
  // 配置键常量
  private static readonly DB_LOCATION_KEY = 'system.database.location';
  
  // 默认数据库路径
  private defaultDbPath: string = '';
  
  // 监听器集合
  private listeners: Map<string, Set<(value: string, oldValue: string | null) => void>> = new Map();
  
  /**
   * 构造函数
   * @param configRepository 配置仓库
   * @param dbService 数据库服务
   */
  constructor(
    private configRepository: IConfigRepository,
    private dbService: IDatabaseService
  ) {}
  
  /**
   * 初始化配置服务
   */
  async initialize(): Promise<void> {
    console.log('初始化配置服务...');
    
    // 获取默认数据库路径
    try {
      // 使用Tauri API获取AppData目录
      const appDataDir = await this.getAppDataDir();
      const { join } = await import('@tauri-apps/api/path');
      this.defaultDbPath = await join(appDataDir, 'data', 'db', 'fishmind.db');
      const dataDir = await join(appDataDir, 'data','db');
      
      // 确保目录存在
      await this.ensureDbDirectoryExists(dataDir);
      
      console.log(`默认数据库路径: ${this.defaultDbPath}`);
    } catch (error) {
      console.error('获取默认数据库路径失败:', error);
      // 使用相对路径作为备选
      this.defaultDbPath = './fishmind.db';
    }
    
    // 确保数据库位置配置存在
    const dbLocation = await this.getDatabaseLocation();
    if (!dbLocation) {
      // 如果数据库位置配置不存在，使用默认路径
      await this.setDatabaseLocation(this.defaultDbPath);
    }
    
    console.log('配置服务初始化完成');
  }
  
  /**
   * 获取AppData目录
   * @returns AppData目录路径
   */
  private async getAppDataDir(): Promise<string> {
    // 使用Tauri API获取AppData目录
    const { appDataDir } = await import('@tauri-apps/api/path');
    return await appDataDir();
  }
  
  /**
   * 确保数据库目录存在
   * @param dirPath 目录路径
   */
  private async ensureDbDirectoryExists(dirPath: string): Promise<void> {
    try {
      const {  mkdir, exists } = await import('@tauri-apps/plugin-fs');
      const dirExists = await exists(dirPath);
      
      if (!dirExists) {
        await mkdir(dirPath, { recursive: true });
        console.log(`创建数据库目录: ${dirPath}`);
      }
    } catch (error) {
      console.error(`创建数据库目录失败: ${dirPath}`, error);
      throw error;
    }
  }
  
  /**
   * 释放配置服务资源
   */
  async dispose(): Promise<void> {
    console.log('释放配置服务资源...');
    
    // 清除所有监听器
    this.listeners.clear();
    
    console.log('配置服务资源释放完成');
  }
  
  /**
   * 获取配置值
   * @param key 配置键
   * @returns 配置值或null（如果不存在）
   */
  async getValue(key: string): Promise<string | null> {
    return this.configRepository.getValue(key);
  }
  
  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  async setValue(key: string, value: string): Promise<void> {
    const oldValue = await this.getValue(key);
    await this.configRepository.setValue(key, value);
    
    // 触发监听器
    this.notifyListeners(key, value, oldValue);
  }
  
  /**
   * 获取类型安全的配置值
   * @param key 配置键
   * @param defaultValue 默认值（如果配置不存在）
   * @returns 类型安全的配置值
   */
  async getTypedValue<T>(key: string, defaultValue: T): Promise<T> {
    return this.configRepository.getTypedValue<T>(key, defaultValue);
  }
  
  /**
   * 设置类型安全的配置值
   * @param key 配置键
   * @param value 配置值
   */
  async setTypedValue<T>(key: string, value: T): Promise<void> {
    const oldValue = await this.getValue(key);
    await this.configRepository.setTypedValue<T>(key, value);
    
    // 获取字符串值以触发监听器
    const stringValue = await this.getValue(key);
    if (stringValue !== null) {
      this.notifyListeners(key, stringValue, oldValue);
    }
  }
  
  /**
   * 获取配置元数据
   * @param key 配置键
   * @returns 配置元数据或null（如果不存在）
   */
  async getMetadata(key: string): Promise<ConfigMetadata | null> {
    return this.configRepository.getMetadata(key);
  }
  
  /**
   * 获取分组配置
   * @param group 配置分组
   * @returns 分组内的所有配置
   */
  async getConfigsByGroup(group: string): Promise<Config[]> {
    return this.configRepository.findByGroup(group);
  }
  
  /**
   * 获取分组元数据
   * @param group 配置分组
   * @returns 分组内的所有配置元数据
   */
  async getMetadataByGroup(group: string): Promise<ConfigMetadata[]> {
    return this.configRepository.getMetadataByGroup(group);
  }
  
  /**
   * 批量设置配置值
   * @param configs 配置键值对
   */
  async setValues(configs: Record<string, string>): Promise<void> {
    // 获取旧值用于通知监听器
    const oldValues = new Map<string, string | null>();
    for (const key of Object.keys(configs)) {
      oldValues.set(key, await this.getValue(key));
    }
    
    // 批量设置值
    await this.configRepository.setValues(configs);
    
    // 触发所有监听器
    for (const [key, value] of Object.entries(configs)) {
      this.notifyListeners(key, value, oldValues.get(key) || null);
    }
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
      
      // 如果没有监听器了，删除该键的监听器集合
      if (this.listeners.get(key)!.size === 0) {
        this.listeners.delete(key);
      }
    }
  }
  
  /**
   * 获取数据库位置
   * @returns 数据库文件路径
   */
  async getDatabaseLocation(): Promise<string> {
    const location = await this.getValue(ConfigService.DB_LOCATION_KEY);
    return location || this.defaultDbPath;
  }
  
  /**
   * 设置数据库位置
   * @param location 数据库文件路径
   */
  async setDatabaseLocation(location: string): Promise<void> {
    const oldLocation = await this.getDatabaseLocation();
    
    // 如果路径为空，使用默认路径
    const newLocation = location || this.defaultDbPath;
    
    // 设置新位置
    await this.setValue(ConfigService.DB_LOCATION_KEY, newLocation);
    
    // 如果旧位置存在且不同于新位置，则迁移数据库
    if (oldLocation && oldLocation !== newLocation) {
      try {
        // 确保目标目录存在
        const lastSlashIndex = newLocation.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          const dirPath = newLocation.substring(0, lastSlashIndex);
          await this.ensureDbDirectoryExists(dirPath);
        }
        
        // 迁移数据库
        await this.dbService.changeLocation(newLocation);
      } catch (error) {
        // 如果迁移失败，恢复旧位置
        await this.setValue(ConfigService.DB_LOCATION_KEY, oldLocation);
        throw new Error(`数据库位置更改失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  /**
   * 重置数据库位置到默认路径
   */
  async resetDatabaseLocation(): Promise<void> {
    await this.setDatabaseLocation(this.defaultDbPath);
  }
  
  /**
   * 触发配置变更监听器
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
          console.error(`配置监听器回调错误 (${key}):`, error);
        }
      }
    }
  }
} 