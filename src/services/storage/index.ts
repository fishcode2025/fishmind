import { initDatabase } from '../../lib/tauri/db';
import { ensureDir } from '../../lib/tauri/fs';
import { encryptionService, EncryptionService } from '../encryption/EncryptionService';
import {  chatTopicStorage } from './ChatTopicStorage';
import { chatMessageStorage } from './ChatMessageStorage';
import { StorageError, StorageErrorType } from './types';

const APP_CHATS_DATA="chat"
/**
 * 初始化存储服务
 */
export async function initializeStorage(): Promise<void> {
  try {
    // 确保目录存在
    await ensureDir(APP_CHATS_DATA);
    
    // 初始化数据库
    await initDatabase();
    
    // 初始化加密服务
    await encryptionService.initialize();
    
    // 确保主密钥存在
    await encryptionService.generateMasterKey();
    
    console.log('Storage service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize storage service', error);
    throw new StorageError(
      `Failed to initialize storage service: ${error instanceof Error ? error.message : String(error)}`,
      StorageErrorType.UNKNOWN_ERROR
    );
  }
}

// 导出存储服务
export {
  chatTopicStorage,
  chatMessageStorage,
  StorageError,
  StorageErrorType
};

// 导出类型
export * from './types'; 