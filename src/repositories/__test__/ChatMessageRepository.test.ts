import { ChatMessageRepository } from '../ChatMessageRepository';
import { IDatabaseService } from '../../services/database/interfaces';
import { Message } from '../../models/chat';

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

describe('MessageRepository', () => {
  let repository: ChatMessageRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ChatMessageRepository(mockDb);
  });
  
  it('should find message by id', async () => {
    const mockMessage: Message = {
      id: '123',
      topicId: 'topic-1',
      role: 'user',
      content: 'Hello',
      timestamp: '2023-01-01T00:00:00Z'
    };
    
    mockDb.get.mockResolvedValue(mockMessage);
    
    const result = await repository.findById('123');
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT * FROM messages WHERE id = ?',
      ['123']
    );
    expect(result).toEqual(mockMessage);
  });
  
  it('should find all messages', async () => {
    const mockMessages: Message[] = [
      {
        id: '123',
        topicId: 'topic-1',
        role: 'user',
        content: 'Hello',
        timestamp: '2023-01-01T00:00:00Z'
      },
      {
        id: '456',
        topicId: 'topic-1',
        role: 'assistant',
        content: 'Hi there',
        timestamp: '2023-01-01T00:00:01Z'
      }
    ];
    
    mockDb.query.mockResolvedValue(mockMessages);
    
    const result = await repository.findAll();
    
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM messages ORDER BY timestamp DESC'
    );
    expect(result).toEqual(mockMessages);
  });
  
  it('should create a new message', async () => {
    const messageToCreate = {
      topicId: 'topic-1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: '2023-01-01T00:00:00Z'
    };
    
    mockDb.execute.mockResolvedValue();
    
    const result = await repository.create(messageToCreate);
    
    expect(mockDb.execute).toHaveBeenCalled();
    expect(result.id).toBeDefined();
    expect(result.topicId).toBe(messageToCreate.topicId);
    expect(result.role).toBe(messageToCreate.role);
    expect(result.content).toBe(messageToCreate.content);
    expect(result.timestamp).toBe(messageToCreate.timestamp);
  });
  
  it('should update a message', async () => {
    const existingMessage: Message = {
      id: '123',
      topicId: 'topic-1',
      role: 'user',
      content: 'Hello',
      timestamp: '2023-01-01T00:00:00Z'
    };
    
    const updateData = {
      content: 'Updated content'
    };
    
    mockDb.get.mockResolvedValue(existingMessage);
    mockDb.execute.mockResolvedValue();
    
    const result = await repository.update('123', updateData);
    
    expect(mockDb.execute).toHaveBeenCalled();
    expect(result.id).toBe('123');
    expect(result.content).toBe(updateData.content);
    expect(result.topicId).toBe(existingMessage.topicId);
    expect(result.role).toBe(existingMessage.role);
    expect(result.timestamp).toBe(existingMessage.timestamp);
  });
  
  it('should delete a message', async () => {
    mockDb.execute.mockResolvedValue();
    
    await repository.delete('123');
    
    expect(mockDb.execute).toHaveBeenCalledWith(
      'DELETE FROM messages WHERE id = ?',
      ['123']
    );
  });
  
  it('should count messages', async () => {
    mockDb.get.mockResolvedValue({ count: 10 });
    
    const result = await repository.count();
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT COUNT(*) as count FROM messages'
    );
    expect(result).toBe(10);
  });
  
  it('should find messages by topic id', async () => {
    const mockMessages: Message[] = [
    ];
  });
});
