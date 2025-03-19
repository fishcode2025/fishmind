// 模拟Tauri API
async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  console.log(`[Mock] Invoking: ${command}`, args);
  
  // 根据命令返回模拟数据
  if (command === 'plugin:encryption|initialize') {
    return null as unknown as T;
  } else if (command === 'plugin:encryption|generate_master_key') {
    return { id: 'mock-master-key', created: new Date().toISOString() } as unknown as T;
  } else if (command === 'plugin:encryption|generate_data_key') {
    return { id: 'mock-data-key', created: new Date().toISOString() } as unknown as T;
  } else if (command === 'plugin:encryption|encrypt') {
    return { ciphertext: 'encrypted-data', iv: 'mock-iv', keyId: 'mock-key-id' } as unknown as T;
  } else if (command === 'plugin:encryption|decrypt') {
    return 'decrypted-data' as unknown as T;
  }
  
  throw new Error(`未实现的模拟命令: ${command}`);
}

import { EncryptedData, KeyInfo, EncryptionError, EncryptionErrorType } from './types';

/**
 * 加密服务
 * 负责数据加密和解密操作
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private initialized: boolean = false;
  
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }
  
  /**
   * 初始化加密服务
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // 调用Rust后端初始化加密服务
      await invoke('plugin:encryption|initialize');
      this.initialized = true;
    } catch (error: unknown) {
      console.error('Failed to initialize encryption service', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new EncryptionError(
        `Failed to initialize encryption service: ${errorMessage}`,
        EncryptionErrorType.UNKNOWN_ERROR
      );
    }
  }
  
  /**
   * 生成新的主密钥
   * 如果已有主密钥，则返回现有密钥的信息
   */
  public async generateMasterKey(): Promise<KeyInfo> {
    try {
      await this.initialize();
      return await invoke<KeyInfo>('plugin:encryption|generate_master_key');
    } catch (error: unknown) {
      console.error('Failed to generate master key', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new EncryptionError(
        `Failed to generate master key: ${errorMessage}`,
        EncryptionErrorType.KEY_GENERATION_ERROR
      );
    }
  }
  
  /**
   * 为特定话题生成数据加密密钥
   */
  public async generateDataKey(topicId: string): Promise<KeyInfo> {
    try {
      await this.initialize();
      return await invoke<KeyInfo>('plugin:encryption|generate_data_key', { topicId });
    } catch (error: unknown) {
      console.error(`Failed to generate data key for topic ${topicId}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new EncryptionError(
        `Failed to generate data key: ${errorMessage}`,
        EncryptionErrorType.KEY_GENERATION_ERROR
      );
    }
  }
  
  /**
   * 加密数据
   */
  public async encrypt(data: string, topicId: string): Promise<EncryptedData> {
    try {
      await this.initialize();
      return await invoke<EncryptedData>('plugin:encryption|encrypt', {
        data,
        topicId
      });
    } catch (error: unknown) {
      console.error('Encryption failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new EncryptionError(
        `Encryption failed: ${errorMessage}`,
        EncryptionErrorType.ENCRYPTION_ERROR
      );
    }
  }
  
  /**
   * 解密数据
   */
  public async decrypt(encryptedData: EncryptedData, topicId: string): Promise<string> {
    try {
      await this.initialize();
      return await invoke<string>('plugin:encryption|decrypt', {
        encryptedData,
        topicId
      });
    } catch (error: unknown) {
      console.error('Decryption failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new EncryptionError(
        `Decryption failed: ${errorMessage}`,
        EncryptionErrorType.DECRYPTION_ERROR
      );
    }
  }
}

// 导出单例实例
export const encryptionService = EncryptionService.getInstance(); 