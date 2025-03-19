import { StreamEventType, StreamEventFactory } from '../StreamEventHandler';

describe('StreamEventTypes', () => {
  it('should have all required event types', () => {
    // 会话生命周期事件
    expect(StreamEventType.SESSION_START).toBeDefined();
    expect(StreamEventType.SESSION_END).toBeDefined();
    expect(StreamEventType.SESSION_ERROR).toBeDefined();
    
    // 模型响应事件
    expect(StreamEventType.MODEL_RESPONSE_WAITING).toBeDefined();
    expect(StreamEventType.MODEL_GENERATION_STOP).toBeDefined();
    
    // 基础响应事件
    expect(StreamEventType.TEXT).toBeDefined();
    
    // 工具调用事件
    expect(StreamEventType.TOOL_ARGS_START).toBeDefined();
    expect(StreamEventType.TOOL_ARGS_COMPLETE).toBeDefined();
    
    // MCP工具执行事件
    expect(StreamEventType.MCP_TOOL_START).toBeDefined();
    expect(StreamEventType.MCP_TOOL_EXECUTING).toBeDefined();
    expect(StreamEventType.MCP_TOOL_SUCCESS).toBeDefined();
    expect(StreamEventType.MCP_TOOL_ERROR).toBeDefined();
    expect(StreamEventType.MCP_TOOL_TIMEOUT).toBeDefined();
    
    // 工具链事件
    expect(StreamEventType.TOOL_CHAIN_START).toBeDefined();
    expect(StreamEventType.TOOL_CHAIN_COMPLETE).toBeDefined();
    
    // 控制事件
    expect(StreamEventType.ABORT).toBeDefined();
    expect(StreamEventType.DONE).toBeDefined();
  });
  
  it('should create tool chain events', () => {
    const messageId = 'test-message-id';
    const toolCallIds = ['tool-1', 'tool-2'];
    
    const startEvent = StreamEventFactory.createToolChainEvent(
      StreamEventType.TOOL_CHAIN_START,
      messageId,
      toolCallIds
    );
    
    expect(startEvent.type).toBe(StreamEventType.TOOL_CHAIN_START);
    expect(startEvent.messageId).toBe(messageId);
    expect(startEvent.toolCallIds).toEqual(toolCallIds);
    expect(startEvent.timestamp).toBeDefined();
    
    const completeEvent = StreamEventFactory.createToolChainEvent(
      StreamEventType.TOOL_CHAIN_COMPLETE,
      messageId,
      toolCallIds
    );
    
    expect(completeEvent.type).toBe(StreamEventType.TOOL_CHAIN_COMPLETE);
    expect(completeEvent.messageId).toBe(messageId);
    expect(completeEvent.toolCallIds).toEqual(toolCallIds);
    expect(completeEvent.timestamp).toBeDefined();
  });
  

}); 