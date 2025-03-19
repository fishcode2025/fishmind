/**
 * 存储服务
 * 提供本地存储功能
 */
export class StorageService {
  /**
   * 设置存储项
   * @param key 键
   * @param value 值
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set item in storage: ${key}`, error);
      throw error;
    }
  }
  
  /**
   * 获取存储项
   * @param key 键
   * @returns 值，如果不存在则返回null
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get item from storage: ${key}`, error);
      return null;
    }
  }
  
  /**
   * 删除存储项
   * @param key 键
   */
  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item from storage: ${key}`, error);
      throw error;
    }
  }
  
  /**
   * 清除所有存储项
   */
  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage', error);
      throw error;
    }
  }
} 