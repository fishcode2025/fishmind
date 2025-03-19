/**
 * SQLite数据库服务实现
 * 使用Tauri的SQLite插件与数据库交互
 */

// 正确导入 SQL 插件
import Database from '@tauri-apps/plugin-sql';
import { IDatabaseService, DatabaseError, DatabaseErrorType } from './interfaces';
import { createTables } from './schema';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';

/**
 * SQLite数据库服务类
 * 实现IDatabaseService接口，提供与SQLite数据库交互的功能
 */
export class SQLiteService implements IDatabaseService {
  private db: Database | null = null;
  private dbPath: string = '';
  private initialized: boolean = false;

  /**
   * 构造函数
   */
  constructor() {}

  /**
   * 初始化数据库连接
   * @param dbPath 可选的数据库文件路径，如果不提供则使用默认路径
   */
  async initialize(dbPath?: string): Promise<void> {
    try {
      // 如果已经初始化，先关闭现有连接
      if (this.db) {
        await this.close();
      }
      
      // 确定数据库路径
      if (dbPath) {
        this.dbPath = dbPath;
      } else {
        // 使用默认路径
        
        const appData = await appDataDir();
        this.dbPath = await join(appData, 'data', 'db', 'fishmind.db');
        
        // 确保目录存在
        const dirPath = await join(appData, 'data', 'db');
        const dirExists = await exists(dirPath);
        
        if (!dirExists) {
          await mkdir(dirPath, { recursive: true });
        }
      }
      
      console.log(`初始化数据库: ${this.dbPath}`);
      
      // 打开数据库连接
      this.db = await Database.load(`sqlite:${this.dbPath}`);
      this.initialized=true

      // 创建表结构
      await createTables(this);
      console.log('数据库初始化成功');
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw new DatabaseError(
        `数据库初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.CONNECTION_ERROR
      );
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      try {
        console.log('关闭数据库连接...');
        await this.db.close();
        console.log('数据库连接已关闭');
        this.db = null;
        this.initialized = false;
      } catch (error) {
        console.error('关闭数据库连接失败:', error);
        // 即使关闭失败，也重置状态
        this.db = null;
        this.initialized = false;
        throw new DatabaseError(
          `数据库关闭失败: ${error instanceof Error ? error.message : String(error)}`,
          DatabaseErrorType.CONNECTION_ERROR
        );
      }
    } else {
      console.log('数据库连接已经关闭');
      this.initialized = false;
    }
  }

  /**
   * 备份数据库到指定路径
   * @param targetPath 备份文件路径
   */
  async backup(targetPath: string): Promise<void> {
    this.ensureInitialized();

    try {
      console.log(`备份数据库从 ${this.dbPath} 到 ${targetPath}`);

      // 使用 VACUUM INTO 命令进行备份
      await this.db!.execute(`VACUUM INTO '${targetPath}'`);
      
      console.log('数据库备份完成');
    } catch (error) {
      console.error('数据库备份失败:', error);
      throw new DatabaseError(
        `数据库备份失败: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.BACKUP_ERROR
      );
    }
  }

  /**
   * 从指定路径恢复数据库
   * @param sourcePath 备份文件路径
   * 
   * TODO: 此方法目前在测试中失败，需要修复
   */
  async restore(sourcePath: string): Promise<void> {
    try {
      // 关闭当前数据库连接
      await this.close();
      
      // 记住当前数据库路径
      const currentPath = this.dbPath;
      
      console.log(`从备份文件 ${sourcePath} 恢复到 ${currentPath}`);
      
      // 重新初始化，但使用备份文件作为数据库源
      this.db = null;
      this.initialized = false;
      this.dbPath = '';
      
      // 直接使用备份文件作为数据库
      await this.initialize(sourcePath);
      
      console.log('数据库恢复完成');
    } catch (error) {
      console.error('数据库恢复失败:', error);
      throw new DatabaseError(
        `数据库恢复失败: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.RESTORE_ERROR
      );
    }
  }

  /**
   * 更改数据库位置
   * @param newLocation 新的数据库文件路径
   */
  async changeLocation(newLocation: string): Promise<void> {
    try {
      console.log(`更改数据库位置: ${this.dbPath} -> ${newLocation}`);
      
      // 如果数据库尚未初始化，直接初始化到新位置
      if (!this.db) {
        await this.initialize(newLocation);
        return;
      }
      
      // 备份当前数据库
      await this.backup(newLocation);
      
      // 关闭当前连接
      await this.close();
      
      // 初始化新位置的数据库
      await this.initialize(newLocation);
      
      console.log('数据库位置更改成功');
    } catch (error) {
      console.error('数据库位置更改失败:', error);
      
      // 尝试重新连接到原位置
      if (this.dbPath && this.dbPath !== newLocation) {
        try {
          await this.initialize(this.dbPath);
        } catch (reconnectError) {
          console.error('重新连接到原数据库失败:', reconnectError);
        }
      }
      
      throw new DatabaseError(
        `数据库位置更改失败: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.MIGRATION_ERROR
      );
    }
  }

  /**
   * 获取当前数据库位置
   * @returns 数据库文件路径
   */
  async getLocation(): Promise<string> {
    return this.dbPath;
  }

  /**
   * 在事务中执行操作
   * @param callback 要在事务中执行的回调函数
   * @returns 回调函数的返回值
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    this.ensureInitialized();
    
    try {
      await this.execute('BEGIN TRANSACTION');
      
      try {
        const result = await callback();
        await this.execute('COMMIT');
        return result;
      } catch (error) {
        await this.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw new DatabaseError(
        `事务执行失败: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.TRANSACTION_ERROR
      );
    }
  }

  /**
   * 执行查询并返回结果集
   * @param sql SQL查询语句
   * @param params 查询参数
   * @returns 查询结果集
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.initialized) {
      console.log('数据库未初始化', DatabaseErrorType.CONNECTION_ERROR);
      this.ensureInitialized();

    }
    
    try {
      console.log('执行查询:', sql);
      console.log('查询参数:', params);
      
      const result = (await this.db!.select(sql, params)) as any[];
      
      console.log(`查询返回 ${result.length} 条记录`);
      if (result.length > 0) {
        console.log('第一条记录:', result[0]);
      }
      
      return result as T[];
    } catch (error: unknown) {
      console.error('查询失败:', error);
      
      // 获取详细的错误信息
      let errorMessage = '未知错误';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      // 检查是否包含特定的错误类型
      const errorStr = String(error);
      if (errorStr.includes('no such table')) {
        throw new DatabaseError(
          `查询失败: 表不存在 - ${errorMessage}`,
          DatabaseErrorType.NOT_FOUND
        );
      }
      
      throw new DatabaseError(
        `查询失败: ${errorMessage}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }

  /**
   * 执行SQL语句（插入、更新、删除等）
   * @param sql SQL语句
   * @param params SQL参数
   */
  async execute(sql: string, params: any[] = []): Promise<void> {
    try {
      this.ensureInitialized();
      
      console.log(`执行SQL: ${sql}`, params);
      await this.db!.execute(sql, params);
      console.log('SQL执行成功');
    } catch (error: unknown) {
      console.error(`SQL执行失败: ${sql}`, params, error);
      
      // 获取详细的错误信息
      let errorMessage = '未知错误';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      // 检查是否包含特定的错误类型
      const errorStr = String(error);
      if (errorStr.includes('no such table')) {
        throw new DatabaseError(
          `SQL执行失败: 表不存在 - ${errorMessage}`,
          DatabaseErrorType.NOT_FOUND
        );
      } else if (errorStr.includes('syntax error')) {
        throw new DatabaseError(
          `SQL执行失败: 语法错误 - ${errorMessage}`,
          DatabaseErrorType.QUERY_ERROR
        );
      } else if (errorStr.includes('UNIQUE constraint failed')) {
        throw new DatabaseError(
          `SQL执行失败: 唯一约束冲突 - ${errorMessage}`,
          DatabaseErrorType.VALIDATION_ERROR
        );
      }
      
      throw new DatabaseError(
        `SQL执行失败: ${errorMessage}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }

  /**
   * 执行查询并返回单个结果
   * @param sql SQL查询语句
   * @param params 查询参数
   * @returns 单个查询结果或null
   */
  async get<T>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      this.ensureInitialized();
      
      console.log(`执行查询: ${sql}`, params);
      const results = (await this.db!.select(sql, params)) as any[];

      console.log(`查询返回 ${results.length} 条记录`);
      
      if (results.length === 0) {
        return null;
      }
      
      return results[0] as T;
    } catch (error: unknown) {
      console.error(`查询失败: ${sql}`, params, error);
      
      // 获取详细的错误信息
      let errorMessage = '未知错误';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      // 检查是否包含特定的错误类型
      const errorStr = String(error);
      if (errorStr.includes('no such table')) {
        throw new DatabaseError(
          `查询失败: 表不存在 - ${errorMessage}`,
          DatabaseErrorType.NOT_FOUND
        );
      }
      
      throw new DatabaseError(
        `查询失败: ${errorMessage}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }

  /**
   * 确保数据库已初始化
   * @private
   */
  private ensureInitialized(): void {
    if (!this.db || !this.initialized) {
      throw new DatabaseError('数据库未初始化', DatabaseErrorType.CONNECTION_ERROR);
    }
  }
} 