好的，我来设计一个分步骤的实施计划。每个步骤都包含具体的改动和验证方法：

### 第一阶段：事件类型系统升级

1. **更新 StreamEventType 枚举**
```typescript
// 验证方法：创建一个测试函数，确保所有事件类型都被正确定义
function validateEventTypes() {
    const requiredEvents = [
        'SESSION_START', 'SESSION_END', 'SESSION_ERROR',
        'MODEL_RESPONSE_WAITING', 'MODEL_GENERATION_STOP',
        // ... 其他事件类型
    ];
    
    const definedEvents = Object.keys(StreamEventType);
    const missingEvents = requiredEvents.filter(e => !definedEvents.includes(e));
    
    if (missingEvents.length > 0) {
        console.error('Missing event types:', missingEvents);
        return false;
    }
    return true;
}
```

2. **定义基础事件接口**
```typescript
// 验证方法：创建一个类型检查函数
function validateEventInterface(event: StreamEvent): boolean {
    return (
        typeof event.type === 'string' &&
        typeof event.timestamp === 'number' &&
        typeof event.messageId === 'string'
    );
}
```

3. **实现具体事件类型接口**
```typescript
// 验证方法：为每种事件类型创建测试用例
function validateSpecificEventTypes() {
    const testEvents: StreamEvent[] = [
        {
            type: StreamEventType.SESSION_START,
            timestamp: Date.now(),
            messageId: 'test-1'
        },
        {
            type: StreamEventType.TEXT,
            timestamp: Date.now(),
            messageId: 'test-2',
            content: 'test content'
        },
        // ... 其他事件类型的测试用例
    ];
    
    return testEvents.every(event => validateEventInterface(event));
}
```

### 第二阶段：工具调用上下文管理

4. **实现 ToolCallContext 类**
```typescript
// 验证方法：测试工具调用上下文管理
function validateToolCallContext() {
    const context = new ToolCallContext();
    
    // 测试工具链管理
    context.startToolChain();
    context.addToolCall({
        type: StreamEventType.MCP_TOOL_START,
        toolCallId: 'tool-1',
        toolName: 'test-tool',
        timestamp: Date.now(),
        messageId: 'test'
    });
    
    const history = context.getToolCallHistory();
    return history.length === 1 && history[0].toolCallId === 'tool-1';
}
```

5. **添加工具链追踪功能**
```typescript
// 验证方法：测试工具链追踪
function validateToolChainTracking() {
    const context = new ToolCallContext();
    
    // 模拟连续工具调用
    context.startToolChain();
    context.addToolCall(/* tool 1 */);
    context.addToolCall(/* tool 2 */);
    context.completeToolChain();
    
    const chains = context.getToolChains();
    return chains.length === 1 && chains[0].length === 2;
}
```

### 第三阶段：ChatService 集成

6. **集成新的事件系统**
```typescript
// 验证方法：测试事件发送
async function validateEventEmission() {
    const events: StreamEvent[] = [];
    await chatService.generateAiReplyStream(
        'test-topic',
        (event) => events.push(event)
    );
    
    return validateEventSequence(events);
}

function validateEventSequence(events: StreamEvent[]): boolean {
    // 验证事件序列是否符合预期
    const startEvent = events[0];
    const endEvent = events[events.length - 1];
    
    return (
        startEvent.type === StreamEventType.SESSION_START &&
        (endEvent.type === StreamEventType.SESSION_END ||
         endEvent.type === StreamEventType.SESSION_ERROR)
    );
}
```

7. **实现工具调用链支持**
```typescript
// 验证方法：测试连续工具调用
async function validateToolChainExecution() {
    const events: StreamEvent[] = [];
    await chatService.generateAiReplyStream(
        'test-topic',
        (event) => events.push(event)
    );
    
    // 检查工具链事件
    const chainStartEvents = events.filter(
        e => e.type === StreamEventType.TOOL_CHAIN_START
    );
    const chainCompleteEvents = events.filter(
        e => e.type === StreamEventType.TOOL_CHAIN_COMPLETE
    );
    
    return chainStartEvents.length === chainCompleteEvents.length;
}
```

### 第四阶段：错误处理和状态管理

8. **完善错误处理**
```typescript
// 验证方法：测试错误场景
async function validateErrorHandling() {
    const events: StreamEvent[] = [];
    try {
        await chatService.generateAiReplyStream(
            'invalid-topic',
            (event) => events.push(event)
        );
    } catch (error) {
        const errorEvent = events.find(
            e => e.type === StreamEventType.SESSION_ERROR
        );
        return errorEvent && errorEvent.error?.code === 'STREAM_ERROR';
    }
    return false;
}
```

9. **实现状态追踪**
```typescript
// 验证方法：测试状态转换
function validateStateTransitions() {
    const transitions = new Map<StreamEventType, StreamEventType[]>();
    
    return (event: StreamEvent, previousEvent?: StreamEvent): boolean => {
        if (!previousEvent) return true;
        const allowedNext = transitions.get(previousEvent.type);
        return allowedNext ? allowedNext.includes(event.type) : true;
    };
}
```

### 执行计划：

1. 每个步骤建议创建单独的分支
2. 使用 agent 模式逐步实现每个功能
3. 每完成一个步骤，运行验证方法确保功能正确
4. 编写单元测试覆盖新增功能
5. 进行代码审查后合并到主分支

### 建议的 agent 命令：

1. 查看文件：
```
/file src/services/chat/StreamEventHandler.ts
/file src/services/chat/ChatService.ts
```

2. 应用更改：
```
/apply 更改描述和代码
```

3. 运行测试：
```
/test 运行指定的验证方法
```

每个步骤完成后，我们可以：
1. 验证功能是否正确
2. 检查类型安全性
3. 确保向后兼容性
4. 更新相关文档

需要我详细展开哪个步骤的实现吗？
