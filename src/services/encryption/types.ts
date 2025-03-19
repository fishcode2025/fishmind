/**
 * 加密数据包装器
 */
export interface EncryptedData {
  ciphertext: string;  // Base64编码的密文
  iv: string;          // Base64编码的初始化向量
  tag?: string;        // Base64编码的认证标签（用于AEAD模式）
}

/**
 * 加密密钥信息
 */
export interface KeyInfo {
  id: string;          // 密钥ID
  algorithm: string;   // 使用的算法
  createdAt: string;   // 创建时间
}

/**
 * 加密服务错误类型
 */
export enum EncryptionErrorType {
  KEY_GENERATION_ERROR = 'KEY_GENERATION_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  INVALID_KEY = 'INVALID_KEY',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 加密服务错误
 */
export class EncryptionError extends Error {
  type: EncryptionErrorType;
  
  constructor(message: string, type: EncryptionErrorType = EncryptionErrorType.UNKNOWN_ERROR) {
    super(message);
    this.type = type;
    this.name = 'EncryptionError';
  }
} 