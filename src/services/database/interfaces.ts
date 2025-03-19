/**
 * 数据库服务接口定义
 * 提供与SQLite数据库交互的统一抽象
 */

/**
 * 数据库错误类型枚举
 */
export enum DatabaseErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',   // 连接错误
  QUERY_ERROR = 'QUERY_ERROR',             // 查询错误
  TRANSACTION_ERROR = 'TRANSACTION_ERROR', // 事务错误
  MIGRATION_ERROR = 'MIGRATION_ERROR',     // 迁移错误
  BACKUP_ERROR = 'BACKUP_ERROR',           // 备份错误
  RESTORE_ERROR = 'RESTORE_ERROR',         // 恢复错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',   // 验证错误
  INSERT_ERROR = 'INSERT_ERROR',           // 插入错误
  UPDATE_ERROR = 'UPDATE_ERROR',           // 更新错误
  DELETE_ERROR = 'DELETE_ERROR',           // 删除错误
  NOT_FOUND = 'NOT_FOUND',                 // 未找到
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'          // 未知错误
}

/**
 * 数据库错误类
 * 用于封装数据库操作中的错误
 */
export class DatabaseError extends Error {
  type: DatabaseErrorType;
  
  constructor(message: string, type: DatabaseErrorType = DatabaseErrorType.UNKNOWN_ERROR) {
    super(message);
    this.type = type;
    this.name = 'DatabaseError';
  }
}

/**
 * 数据库服务接口
 * 定义了与数据库交互的所有方法
 */
export interface IDatabaseService {
  /**
   * 初始化数据库连接
   * @param dbPath 可选的数据库文件路径，如果不提供则使用默认路径
   */
  initialize(dbPath?: string): Promise<void>;
  
  /**
   * 关闭数据库连接
   */
  close(): Promise<void>;
  
  /**
   * 备份数据库到指定路径
   * @param targetPath 备份文件路径
   */
  backup(targetPath: string): Promise<void>;
  
  /**
   * 从指定路径恢复数据库
   * @param sourcePath 备份文件路径
   */
  restore(sourcePath: string): Promise<void>;
  
  /**
   * 更改数据库位置
   * @param newLocation 新的数据库文件路径
   */
  changeLocation(newLocation: string): Promise<void>;
  
  /**
   * 获取当前数据库位置
   * @returns 数据库文件路径
   */
  getLocation(): Promise<string>;
  
  /**
   * 在事务中执行操作
   * @param callback 要在事务中执行的回调函数
   * @returns 回调函数的返回值
   */
  transaction<T>(callback: () => Promise<T>): Promise<T>;
  
  /**
   * 执行查询并返回结果集
   * @param sql SQL查询语句
   * @param params 查询参数
   * @returns 查询结果数组
   */
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  
  /**
   * 执行SQL语句（插入、更新、删除等）
   * @param sql SQL语句
   * @param params SQL参数
   */
  execute(sql: string, params?: any[]): Promise<void>;
  
  /**
   * 执行查询并返回单个结果
   * @param sql SQL查询语句
   * @param params 查询参数
   * @returns 单个查询结果或null
   */
  get<T>(sql: string, params?: any[]): Promise<T | null>;
} 