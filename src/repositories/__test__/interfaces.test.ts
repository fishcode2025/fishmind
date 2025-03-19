import { IRepository } from '../interfaces';

describe('Repository Interfaces', () => {
  it('should define all required methods in IRepository', () => {
    // 创建一个模拟实现，检查是否包含所有必需的方法
    const mockRepository: IRepository<any, any> = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    };
    
    // 验证接口定义的完整性
    expect(mockRepository).toBeDefined();
    expect(typeof mockRepository.findById).toBe('function');
    expect(typeof mockRepository.findAll).toBe('function');
    expect(typeof mockRepository.create).toBe('function');
    expect(typeof mockRepository.update).toBe('function');
    expect(typeof mockRepository.delete).toBe('function');
    expect(typeof mockRepository.count).toBe('function');
  });
});
