import { ChatTopicRepository } from '../ChatTopicRepository';
import { IDatabaseService } from '../../services/database/interfaces';
import { Topic } from '../../models/chat';

// 创建模拟数据库服务
const mockDb: jest.Mocked<IDatabaseService> = {
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

describe('TopicRepository', () => {
  let repository: ChatTopicRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ChatTopicRepository(mockDb);
  });
  
  it('should find topic by id', async () => {
    const mockTopic: Topic = {
      id: '123',
      title: 'Test Topic',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      messageCount: 0,
      preview: ''
    };
    
    mockDb.get.mockResolvedValue(mockTopic);
    
    const result = await repository.findById('123');
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT * FROM topics WHERE id = ?',
      ['123']
    );
    expect(result).toEqual(mockTopic);
  });
  
  it('should find all topics', async () => {
    const mockTopics: Topic[] = [
      {
        id: '123',
        title: 'Test Topic 1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        messageCount: 0,
        preview: ''
      },
      {
        id: '456',
        title: 'Test Topic 2',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        messageCount: 0,
        preview: ''
      }
    ];
    
    mockDb.query.mockResolvedValue(mockTopics);
    
    const result = await repository.findAll();
    
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM topics ORDER BY updated_at DESC'
    );
    expect(result).toEqual(mockTopics);
  });
  
  it('should create a new topic', async () => {
    const topicToCreate = {
      title: 'New Topic',
      preview: 'Preview text'
    };
    
    mockDb.execute.mockResolvedValue();
    
    const result = await repository.create(topicToCreate as any);
    
    expect(mockDb.execute).toHaveBeenCalled();
    expect(result.id).toBeDefined();
    expect(result.title).toBe(topicToCreate.title);
    expect(result.preview).toBe(topicToCreate.preview);
    expect(result.messageCount).toBe(0);
    expect(new Date(result.createdAt)).toBeInstanceOf(Date);
    expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
  });
  
  it('should update a topic', async () => {
    const existingTopic: Topic = {
      id: '123',
      title: 'Old Title',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      messageCount: 0,
      preview: 'Old preview'
    };
    
    const updateData = {
      title: 'New Title',
      preview: 'New preview'
    };
    
    mockDb.get.mockResolvedValue(existingTopic);
    mockDb.execute.mockResolvedValue();
    
    const result = await repository.update('123', updateData);
    
    expect(mockDb.execute).toHaveBeenCalled();
    expect(result.id).toBe('123');
    expect(result.title).toBe(updateData.title);
    expect(result.preview).toBe(updateData.preview);
    expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
    expect(result.updatedAt).not.toBe(existingTopic.updatedAt);
  });
  
  it('should delete a topic', async () => {
    mockDb.execute.mockResolvedValue();
    
    await repository.delete('123');
    
    expect(mockDb.execute).toHaveBeenCalledWith(
      'DELETE FROM topics WHERE id = ?',
      ['123']
    );
  });
  
  it('should count topics', async () => {
    mockDb.get.mockResolvedValue({ count: 5 });
    
    const result = await repository.count();
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT COUNT(*) as count FROM topics'
    );
    expect(result).toBe(5);
  });
  
  it('should find topics by title', async () => {
    const mockTopics: Topic[] = [
      {
        id: '123',
        title: 'Test Topic',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        messageCount: 0,
        preview: ''
      }
    ];
    
    mockDb.query.mockResolvedValue(mockTopics);
    
    const result = await repository.findByTitle('Test');
    
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM topics WHERE title LIKE ? ORDER BY updated_at DESC',
      ['%Test%']
    );
    expect(result).toEqual(mockTopics);
  });
  
  it('should find recent topics', async () => {
    const mockTopics: Topic[] = [
      {
        id: '123',
        title: 'Test Topic 1',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        messageCount: 0,
        preview: ''
      },
      {
        id: '456',
        title: 'Test Topic 2',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        messageCount: 0,
        preview: ''
      }
    ];
    
    mockDb.query.mockResolvedValue(mockTopics);
    
    const result = await repository.findRecent(2);
    
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM topics ORDER BY updated_at DESC LIMIT ?',
      [2]
    );
    expect(result).toEqual(mockTopics);
  });
  
  it('should increment message count', async () => {
    const existingTopic: Topic = {
      id: '123',
      title: 'Test Topic',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      messageCount: 1,
      preview: ''
    };
    
    const updatedTopic: Topic = {
      ...existingTopic,
      messageCount: 2,
      updatedAt: '2023-01-02T00:00:00Z'
    };
    
    mockDb.execute.mockResolvedValue();
    mockDb.get.mockResolvedValue(updatedTopic);
    
    const result = await repository.incrementMessageCount('123');
    
    expect(mockDb.execute).toHaveBeenCalledWith(
      'UPDATE topics SET message_count = message_count + 1, updated_at = ? WHERE id = ?',
      [expect.any(String), '123']
    );
    expect(result).toEqual(updatedTopic);
  });
  
  it('should update preview', async () => {
    const existingTopic: Topic = {
      id: '123',
      title: 'Test Topic',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      messageCount: 2,
      preview: ''
    };
    
    const updatedTopic: Topic = {
      ...existingTopic,
      preview: 'New preview',
      updatedAt: '2023-01-02T00:00:00Z'
    };
    
    mockDb.execute.mockResolvedValue();
    mockDb.get.mockResolvedValue(updatedTopic);
    
    const result = await repository.updatePreview('123', 'New preview');
    
    expect(mockDb.execute).toHaveBeenCalledWith(
      'UPDATE topics SET preview = ?, updated_at = ? WHERE id = ?',
      ['New preview', expect.any(String), '123']
    );
    expect(result).toEqual(updatedTopic);
  });
});
