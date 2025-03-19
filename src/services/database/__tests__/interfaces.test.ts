import { IDatabaseService, DatabaseError, DatabaseErrorType } from '../interfaces';

describe('数据库接口定义测试', () => {
  it('应该定义所有必需的方法', () => {
    // 创建一个模拟实现，检查是否包含所有必需的方法
    const mockImplementation: IDatabaseService = {
      initialize: jest.fn(),
      close: jest.fn(),
      backup: jest.fn(),
      restore: jest.fn(),
      changeLocation: jest.fn(),
      getLocation: jest.fn(),
      transaction: jest.fn(),
      query: jest.fn(),
      execute: jest.fn(),
      get: jest.fn()
    };
    
    // 验证接口定义的完整性
    expect(mockImplementation).toBeDefined();
    expect(typeof mockImplementation.initialize).toBe('function');
    expect(typeof mockImplementation.close).toBe('function');
    expect(typeof mockImplementation.backup).toBe('function');
    expect(typeof mockImplementation.restore).toBe('function');
    expect(typeof mockImplementation.changeLocation).toBe('function');
    expect(typeof mockImplementation.getLocation).toBe('function');
    expect(typeof mockImplementation.transaction).toBe('function');
    expect(typeof mockImplementation.query).toBe('function');
    expect(typeof mockImplementation.execute).toBe('function');
    expect(typeof mockImplementation.get).toBe('function');
  });
  
  it('应该创建具有正确类型的DatabaseError', () => {
    const error = new DatabaseError('测试错误', DatabaseErrorType.CONNECTION_ERROR);
    expect(error.message).toBe('测试错误');
    expect(error.type).toBe(DatabaseErrorType.CONNECTION_ERROR);
    expect(error.name).toBe('DatabaseError');
  });
  
  it('应该使用UNKNOWN_ERROR作为默认类型', () => {
    const error = new DatabaseError('测试错误');
    expect(error.type).toBe(DatabaseErrorType.UNKNOWN_ERROR);
  });
  
  it('应该定义所有必需的错误类型', () => {
    // 验证所有必需的错误类型都已定义
    expect(DatabaseErrorType.CONNECTION_ERROR).toBeDefined();
    expect(DatabaseErrorType.QUERY_ERROR).toBeDefined();
    expect(DatabaseErrorType.TRANSACTION_ERROR).toBeDefined();
    expect(DatabaseErrorType.MIGRATION_ERROR).toBeDefined();
    expect(DatabaseErrorType.BACKUP_ERROR).toBeDefined();
    expect(DatabaseErrorType.RESTORE_ERROR).toBeDefined();
    expect(DatabaseErrorType.UNKNOWN_ERROR).toBeDefined();
  });
}); 