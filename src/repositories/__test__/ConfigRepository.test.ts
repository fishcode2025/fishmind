import { ConfigRepository } from '../ConfigRepository';
import { IDatabaseService } from '../../services/database/interfaces';
import { Config, ConfigMetadata, ConfigChangeEvent, ConfigValueType } from '../../models/config';
import { DatabaseError, DatabaseErrorType } from '../../services/database/interfaces';

// 创建模拟数据库服务
const mockDb: jest.Mocked<IDatabaseService> = {
  initialize: jest.fn(),
  close: jest.fn(),
  backup: jest.fn(),
  restore: jest.fn(),
  changeLocation: jest.fn(),
  getLocation: jest.fn(),
  transaction: jest.fn().mockImplementation(async (callback) => await callback()),
  query: jest.fn(),
  execute: jest.fn(),
  get: jest.fn()
};

describe('ConfigRepository', () => {
  let repository: ConfigRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ConfigRepository(mockDb);
  });
  
  // 基本 CRUD 操作测试
  
  it('should find config by key', async () => {
    const mockConfig: Config = {
      key: 'app.theme',
      value: 'dark',
      updatedAt: '2023-01-01T00:00:00Z',
      groupName: 'appearance',
      description: 'Application theme'
    };
    
    mockDb.get.mockResolvedValue(mockConfig);
    
    const result = await repository.findById('app.theme');
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT * FROM configs WHERE key = ?',
      ['app.theme']
    );
    expect(result).toEqual(mockConfig);
  });
  
  it('should find all configs', async () => {
    const mockConfigs: Config[] = [
      {
        key: 'app.theme',
        value: 'dark',
        updatedAt: '2023-01-01T00:00:00Z',
        groupName: 'appearance',
        description: 'Application theme'
      },
      {
        key: 'app.language',
        value: 'zh-CN',
        updatedAt: '2023-01-01T00:00:00Z',
        groupName: 'localization',
        description: 'Application language'
      }
    ];
    
    mockDb.query.mockResolvedValue(mockConfigs);
    
    const result = await repository.findAll();
    
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM configs ORDER BY key'
    );
    expect(result).toEqual(mockConfigs);
  });
  
  it('should create a new config', async () => {
    const configToCreate = {
      key: 'app.theme',
      value: 'dark',
      updatedAt: new Date().toISOString(),
      groupName: 'appearance',
      description: 'Application theme'
    };
    
    mockDb.execute.mockResolvedValue();
    
    const result = await repository.create(configToCreate);
    
    expect(mockDb.execute).toHaveBeenCalledWith(
      `INSERT INTO configs (key, value, updated_at, group, description) 
         VALUES (?, ?, ?, ?, ?)`,
      [
        configToCreate.key,
        configToCreate.value,
        expect.any(String),
        configToCreate.groupName,
        configToCreate.description
      ]
    );
    
    expect(result.key).toBe(configToCreate.key);
    expect(result.value).toBe(configToCreate.value);
    expect(result.groupName).toBe(configToCreate.groupName);
    expect(result.description).toBe(configToCreate.description);
    expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
  });
  
  it('should update a config', async () => {
    const existingConfig: Config = {
      key: 'app.theme',
      value: 'light',
      updatedAt: '2023-01-01T00:00:00Z',
      groupName: 'appearance',
      description: 'Application theme'
    };
    
    const updateData = {
      value: 'dark',
      description: 'Updated description'
    };
    
    mockDb.get.mockResolvedValue(existingConfig);
    mockDb.execute.mockResolvedValue();
    
    const result = await repository.update('app.theme', updateData);
    
    expect(mockDb.execute).toHaveBeenCalled();
    expect(result.key).toBe('app.theme');
    expect(result.value).toBe(updateData.value);
    expect(result.description).toBe(updateData.description);
    expect(result.groupName).toBe(existingConfig.groupName);
    expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
    expect(result.updatedAt).not.toBe(existingConfig.updatedAt);
  });
  
  it('should delete a config', async () => {
    mockDb.execute.mockResolvedValue();
    
    await repository.delete('app.theme');
    
    expect(mockDb.execute).toHaveBeenCalledWith(
      'DELETE FROM configs WHERE key = ?',
      ['app.theme']
    );
  });
  
  it('should count configs', async () => {
    mockDb.get.mockResolvedValue({ count: 5 });
    
    const result = await repository.count();
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT COUNT(*) as count FROM configs'
    );
    expect(result).toBe(5);
  });
  
  // 配置特定方法测试
  
  it('should get config value', async () => {
    const mockConfig: Config = {
      key: 'app.theme',
      value: 'dark',
      updatedAt: '2023-01-01T00:00:00Z'
    };
    
    mockDb.get.mockResolvedValue(mockConfig);
    
    const result = await repository.getValue('app.theme');
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT * FROM configs WHERE key = ?',
      ['app.theme']
    );
    expect(result).toBe('dark');
  });
  
  it('should set config value for existing config', async () => {
    const existingConfig: Config = {
      key: 'app.theme',
      value: 'light',
      updatedAt: '2023-01-01T00:00:00Z'
    };
    
    const updatedConfig: Config = {
      ...existingConfig,
      value: 'dark',
      updatedAt: '2023-01-02T00:00:00Z'
    };
    
    mockDb.get
      .mockResolvedValueOnce('light') // getValue 调用
      .mockResolvedValueOnce(existingConfig); // findById 调用
    
    mockDb.execute.mockResolvedValue();
    
    // 模拟 update 方法的结果
    jest.spyOn(repository, 'update').mockResolvedValue(updatedConfig);
    // 模拟 logChangeEvent 方法
    jest.spyOn(repository, 'logChangeEvent').mockResolvedValue({} as ConfigChangeEvent);
    
    const result = await repository.setValue('app.theme', 'dark');
    
    expect(repository.update).toHaveBeenCalledWith('app.theme', { value: 'dark' });
    expect(repository.logChangeEvent).toHaveBeenCalledWith(expect.objectContaining({
      key: 'app.theme',
      newValue: 'dark'
    }));
    expect(result).toEqual(updatedConfig);
  });
  
  it('should set config value for new config', async () => {
    const newConfig: Config = {
      key: 'app.theme',
      value: 'dark',
      updatedAt: '2023-01-01T00:00:00Z'
    };
    
    mockDb.get.mockResolvedValue(null);
    
    // 模拟 create 方法的结果
    jest.spyOn(repository, 'create').mockResolvedValue(newConfig);
    // 模拟 logChangeEvent 方法
    jest.spyOn(repository, 'logChangeEvent').mockResolvedValue({} as ConfigChangeEvent);
    
    const result = await repository.setValue('app.theme', 'dark');
    
    expect(repository.create).toHaveBeenCalledWith({
      key: 'app.theme',
      value: 'dark',
      updatedAt: expect.any(String)
    });
    expect(repository.logChangeEvent).toHaveBeenCalledWith({
      key: 'app.theme',
      oldValue: '',
      newValue: 'dark'
    });
    expect(result).toEqual(newConfig);
  });
  
  it('should find configs by group', async () => {
    const mockConfigs: Config[] = [
      {
        key: 'app.theme',
        value: 'dark',
        updatedAt: '2023-01-01T00:00:00Z',
        groupName: 'appearance'
      },
      {
        key: 'app.font',
        value: 'Arial',
        updatedAt: '2023-01-01T00:00:00Z',
        groupName: 'appearance'
      }
    ];
    
    mockDb.query.mockResolvedValue(mockConfigs);
    
    const result = await repository.findByGroup('appearance');
    
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM configs WHERE group = ? ORDER BY key',
      ['appearance']
    );
    expect(result).toEqual(mockConfigs);
  });
  
  it('should set multiple config values', async () => {
    const configs = {
      'app.theme': 'dark',
      'app.language': 'zh-CN'
    };
    
    // 模拟 setValue 方法
    jest.spyOn(repository, 'setValue').mockImplementation(async (key, value) => {
      return {
        key,
        value,
        updatedAt: new Date().toISOString()
      } as Config;
    });
    
    const result = await repository.setValues(configs);
    
    expect(repository.setValue).toHaveBeenCalledTimes(2);
    expect(repository.setValue).toHaveBeenCalledWith('app.theme', 'dark');
    expect(repository.setValue).toHaveBeenCalledWith('app.language', 'zh-CN');
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe('app.theme');
    expect(result[1].key).toBe('app.language');
  });
  
  // 配置元数据测试
  
  it('should get config metadata', async () => {
    const mockMetadata: ConfigMetadata = {
      key: 'app.theme',
      name: 'Theme',
      description: 'Application theme',
      groupName: 'appearance',
      type: ConfigValueType.STRING,
      defaultValue: 'light',
      isSystem: false,
      displayOrder: 1
    };
    
    mockDb.get.mockResolvedValue(mockMetadata);
    
    const result = await repository.getMetadata('app.theme');
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT * FROM config_metadata WHERE key = ?',
      ['app.theme']
    );
    expect(result).toEqual(mockMetadata);
  });
  
  it('should set config metadata for new metadata', async () => {
    const metadata: ConfigMetadata = {
      key: 'app.theme',
      name: 'Theme',
      description: 'Application theme',
      groupName: 'appearance',
      type: ConfigValueType.STRING,
      defaultValue: 'light',
      isSystem: false,
      displayOrder: 1
    };
    
    mockDb.get.mockResolvedValue(null);
    mockDb.execute.mockResolvedValue();
    
    const result = await repository.setMetadata(metadata);
    
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO config_metadata'),
      [
        metadata.key,
        metadata.name,
        metadata.description,
        metadata.groupName,
        metadata.type,
        metadata.defaultValue,
        metadata.isSystem ? 1 : 0,
        metadata.displayOrder,
        null
      ]
    );
    expect(result).toEqual(metadata);
  });
  
  // 类型安全的值获取测试
  
  it('should get typed value', async () => {
    const themeConfig = {
      mode: 'dark',
      colors: {
        primary: '#1976d2',
        secondary: '#dc004e'
      }
    };
    
    // 模拟 getValue 方法
    jest.spyOn(repository, 'getValue').mockResolvedValue(JSON.stringify(themeConfig));
    
    const result = await repository.getTypedValue('app.theme', { mode: 'light' });
    
    expect(repository.getValue).toHaveBeenCalledWith('app.theme');
    expect(result).toEqual(themeConfig);
  });
  
  it('should return default value when config does not exist', async () => {
    const defaultValue = { mode: 'light' };
    
    // 模拟 getValue 方法
    jest.spyOn(repository, 'getValue').mockResolvedValue(null);
    
    const result = await repository.getTypedValue('app.theme', defaultValue);
    
    expect(repository.getValue).toHaveBeenCalledWith('app.theme');
    expect(result).toEqual(defaultValue);
  });
  
  it('should return default value when config value is not valid JSON', async () => {
    const defaultValue = { mode: 'light' };
    
    // 模拟 getValue 方法
    jest.spyOn(repository, 'getValue').mockResolvedValue('invalid-json');
    
    // 模拟 console.warn
    jest.spyOn(console, 'warn').mockImplementation();
    
    const result = await repository.getTypedValue('app.theme', defaultValue);
    
    expect(repository.getValue).toHaveBeenCalledWith('app.theme');
    expect(console.warn).toHaveBeenCalled();
    expect(result).toEqual(defaultValue);
  });
  
  it('should set typed value', async () => {
    const themeConfig = {
      mode: 'dark',
      colors: {
        primary: '#1976d2',
        secondary: '#dc004e'
      }
    };
    
    const expectedConfig: Config = {
      key: 'app.theme',
      value: JSON.stringify(themeConfig),
      updatedAt: '2023-01-01T00:00:00Z'
    };
    
    // 模拟 setValue 方法
    jest.spyOn(repository, 'setValue').mockResolvedValue(expectedConfig);
    
    const result = await repository.setTypedValue('app.theme', themeConfig);
    
    expect(repository.setValue).toHaveBeenCalledWith('app.theme', JSON.stringify(themeConfig));
    expect(result).toEqual(expectedConfig);
  });
  
  // 配置观察者模式测试
  
  it('should add and notify listeners', async () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    // 添加监听器
    repository.addListener('app.theme', listener1);
    repository.addListener('app.theme', listener2);
    
    // 手动调用通知方法
    (repository as any).notifyListeners('app.theme', 'dark', 'light');
    
    expect(listener1).toHaveBeenCalledWith('dark', 'light');
    expect(listener2).toHaveBeenCalledWith('dark', 'light');
  });
  
  it('should remove listeners', async () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    // 添加监听器
    repository.addListener('app.theme', listener1);
    repository.addListener('app.theme', listener2);
    
    // 移除一个监听器
    repository.removeListener('app.theme', listener1);
    
    // 手动调用通知方法
    (repository as any).notifyListeners('app.theme', 'dark', 'light');
    
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledWith('dark', 'light');
  });
  
  it('should notify wildcard listeners', async () => {
    const specificListener = jest.fn();
    const wildcardListener = jest.fn();
    
    // 添加监听器
    repository.addListener('app.theme', specificListener);
    repository.addListener('*', wildcardListener);
    
    // 手动调用通知方法
    (repository as any).notifyListeners('app.theme', 'dark', 'light');
    
    expect(specificListener).toHaveBeenCalledWith('dark', 'light');
    expect(wildcardListener).toHaveBeenCalledWith('dark', 'light');
  });
  
  it('should handle listener errors gracefully', async () => {
    const goodListener = jest.fn();
    const badListener = jest.fn().mockImplementation(() => {
      throw new Error('Listener error');
    });
    
    // 模拟 console.error
    jest.spyOn(console, 'error').mockImplementation();
    
    // 添加监听器
    repository.addListener('app.theme', goodListener);
    repository.addListener('app.theme', badListener);
    
    // 手动调用通知方法
    (repository as any).notifyListeners('app.theme', 'dark', 'light');
    
    expect(goodListener).toHaveBeenCalledWith('dark', 'light');
    expect(badListener).toHaveBeenCalledWith('dark', 'light');
    expect(console.error).toHaveBeenCalled();
  });
  
  // 配置迁移测试
  
  it('should migrate configs from one version to another', async () => {
    // 模拟私有迁移方法
    jest.spyOn(repository as any, 'migrateToV1_0_0').mockResolvedValue(undefined);
    jest.spyOn(repository as any, 'migrateToV1_1_0').mockResolvedValue(undefined);
    
    // 模拟 setValue 和 logChangeEvent 方法
    jest.spyOn(repository, 'setValue').mockResolvedValue({} as Config);
    jest.spyOn(repository, 'logChangeEvent').mockResolvedValue({} as ConfigChangeEvent);
    
    await repository.migrateConfigs('0.9.0', '1.1.0');
    
    expect((repository as any).migrateToV1_0_0).toHaveBeenCalled();
    expect((repository as any).migrateToV1_1_0).toHaveBeenCalled();
    expect(repository.setValue).toHaveBeenCalledWith('system.config.version', '1.1.0');
    expect(repository.logChangeEvent).toHaveBeenCalledTimes(2); // 开始和结束各一次
  });
  
  it('should compare versions correctly', async () => {
    const compareVersions = (repository as any).compareVersions;
    
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0.1', '1.0.0')).toBe(1);
  });
}); 