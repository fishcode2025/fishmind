import { BaseDirectory, mkdir, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import Database from '@tauri-apps/plugin-sql';

/**
 * 测试配置服务
 * 用于验证 Tauri 权限配置是否正确
 */
export class ConfigTest {
  private static debug(message: string) {
    if (import.meta.env.DEV) {
      console.log(`[ConfigTest] ${message}`);
    }
  }

  private static error(message: string, error?: unknown) {
    if (import.meta.env.DEV) {
      console.error(`[ConfigTest] ${message}`, error);
    }
  }

  /**
   * 测试文件系统权限
   */
  static async testFileSystemPermissions(): Promise<void> {
    try {
      this.debug('开始测试文件系统权限...');

      // 1. 测试目录创建权限
      this.debug('测试目录创建权限...');
      const dirs = [
        'config',
        'data',
        'data/chats',
        'data/db',
        'logs'
      ];

      for (const dir of dirs) {
        this.debug(`创建目录: ${dir}`);
        const dirExists = await exists(dir, { baseDir: BaseDirectory.AppData });
        if (!dirExists) {
          await mkdir(dir, { 
            baseDir: BaseDirectory.AppData,
            recursive: true 
          });
          this.debug(`目录创建成功: ${dir}`);
        } else {
          this.debug(`目录已存在: ${dir}`);
        }
      }

      // 2. 测试文件写入权限
      this.debug('测试文件写入权限...');
      const testFile = 'config/test.json';
      const testContent = JSON.stringify({ test: 'success' }, null, 2);
      await writeTextFile(testFile, testContent, { baseDir: BaseDirectory.AppData });
      this.debug('文件写入成功');

      // 3. 测试文件读取权限
      this.debug('测试文件读取权限...');
      const content = await readTextFile(testFile, { baseDir: BaseDirectory.AppData });
      this.debug('文件读取成功: ' + content);

      // 4. 测试数据库权限
      this.debug('测试数据库权限...');
      const db = await Database.load('sqlite:data/db/test.db');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS test (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        )
      `);
      this.debug('数据库操作成功');

      this.debug('所有权限测试通过！');
    } catch (error) {
      this.error('权限测试失败:', error);
      throw error;
    }
  }
}

/**
 * 运行配置测试
 * 仅在开发环境中执行
 */
export const testConfig = async () => {
  // 仅在开发环境中运行测试
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    await ConfigTest.testFileSystemPermissions();
    ConfigTest['debug']('配置测试完成');
  } catch (error) {
    ConfigTest['error']('配置测试失败:', error);
    // 在开发环境中抛出错误，生产环境中静默失败
    if (import.meta.env.DEV) {
      throw error;
    }
  }
}; 