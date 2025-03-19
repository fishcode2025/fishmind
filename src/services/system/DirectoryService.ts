import { BaseDirectory, exists, mkdir } from '@tauri-apps/plugin-fs';

/**
 * 应用目录结构
 */
export interface AppDirectories {
  config: string;    // 配置目录
  data: string;      // 数据目录
  chats: string;     // 聊天数据目录
  database: string;  // 数据库目录
  logs: string;      // 日志目录
}

/**
 * 目录管理服务
 * 负责管理应用的目录结构
 */
export class DirectoryService {
  private static instance: DirectoryService;
  private initialized: boolean = false;
  private dirs: AppDirectories = {
    config: 'config',
    data: 'data',
    chats: 'data/chats',
    database: 'data/db',
    logs: 'logs'
  };

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): DirectoryService {
    if (!DirectoryService.instance) {
      DirectoryService.instance = new DirectoryService();
    }
    return DirectoryService.instance;
  }

  /**
   * 初始化目录结构
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 创建所有必需的目录
      for (const [key, dir] of Object.entries(this.dirs)) {
        await this.ensureDirectory(dir);
      }

      this.initialized = true;
      console.log('目录结构初始化完成');
    } catch (error) {
      console.error('目录结构初始化失败:', error);
      throw new Error(`Failed to initialize directory structure: ${error}`);
    }
  }

  /**
   * 确保目录存在，如果不存在则创建
   */
  public async ensureDirectory(dir: string): Promise<void> {
    try {
      const dirExists = await exists(dir, { baseDir: BaseDirectory.AppData });
      if (!dirExists) {
        await mkdir(dir, { 
          baseDir: BaseDirectory.AppData,
          recursive: true 
        });
        console.log(`目录创建成功: ${dir}`);
      }
    } catch (error) {
      console.error(`确保目录存在失败: ${dir}`, error);
      throw error;
    }
  }

  /**
   * 获取目录路径
   */
  public getDirectories(): AppDirectories {
    return { ...this.dirs };
  }

  /**
   * 获取特定目录的路径
   */
  public getDirectory(key: keyof AppDirectories): string {
    return this.dirs[key];
  }

  /**
   * 检查目录是否存在
   */
  public async directoryExists(dir: string): Promise<boolean> {
    try {
      return await exists(dir, { baseDir: BaseDirectory.AppData });
    } catch (error) {
      console.error(`检查目录是否存在失败: ${dir}`, error);
      throw error;
    }
  }

  /**
   * 获取目录的完整路径（包含 BaseDirectory.AppData）
   */
  public async getFullPath(dir: string): Promise<string> {
    // 注意：这里可能需要使用 Tauri 的 path API 来获取完整路径
    // 目前返回相对于 AppData 的路径
    return `$APPDATA/${dir}`;
  }
}

// 导出单例实例
export const directoryService = DirectoryService.getInstance(); 