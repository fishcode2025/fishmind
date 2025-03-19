import { StreamEventType, StreamEvent, validateEventType, StreamEventFactory } from '../StreamEventHandler';

describe('StreamEventHandler', () => {
    describe('Event Types', () => {
        it('should have all required event types', () => {
            const requiredEvents = [
                'SESSION_START', 'SESSION_END', 'SESSION_ERROR',
                'MODEL_RESPONSE_WAITING', 'MODEL_GENERATION_STOP',
                'TEXT',
                'TOOL_ARGS_START', 'TOOL_ARGS_COMPLETE',
                'MCP_TOOL_START', 'MCP_TOOL_EXECUTING', 'MCP_TOOL_SUCCESS', 'MCP_TOOL_ERROR', 'MCP_TOOL_TIMEOUT',
                'TOOL_CHAIN_START', 'TOOL_CHAIN_COMPLETE',
                'ABORT', 'DONE'
            ];
            
            const definedEvents = Object.keys(StreamEventType);
            requiredEvents.forEach(event => {
                expect(definedEvents).toContain(event);
            });
        });
    });

    describe('Event Validation', () => {
        it('should validate text event', () => {
            const textEvent = StreamEventFactory.createTextEvent('msg-1', 'Hello');
            expect(validateEventType(textEvent)).toBe(true);
        });

        it('should validate tool event', () => {
            const toolEvent = StreamEventFactory.createToolEvent(
                StreamEventType.MCP_TOOL_START,
                'msg-1',
                'tool-1',
                'test-tool'
            );
            expect(validateEventType(toolEvent)).toBe(true);
        });

        it('should validate session events', () => {
            const startEvent = StreamEventFactory.createSessionStart('msg-1');
            expect(validateEventType(startEvent)).toBe(true);

            const errorEvent = StreamEventFactory.createSessionError('msg-1', new Error('test'));
            expect(validateEventType(errorEvent)).toBe(true);
        });

        it('should reject invalid events', () => {
            const invalidEvent = {
                type: StreamEventType.TEXT
                // missing required fields
            } as StreamEvent;
            expect(validateEventType(invalidEvent)).toBe(false);
        });
    });

    describe('Event Factory', () => {
        it('should create session start event', () => {
            const event = StreamEventFactory.createSessionStart('msg-1');
            expect(event.type).toBe(StreamEventType.SESSION_START);
            expect(event.messageId).toBe('msg-1');
            expect(event.timestamp).toBeDefined();
        });

        it('should create text event', () => {
            const event = StreamEventFactory.createTextEvent('msg-1', 'Hello');
            expect(event.type).toBe(StreamEventType.TEXT);
            expect(event.content).toBe('Hello');
            expect(event.messageId).toBe('msg-1');
            expect(event.timestamp).toBeDefined();
        });

        it('should create tool event', () => {
            const event = StreamEventFactory.createToolEvent(
                StreamEventType.MCP_TOOL_START,
                'msg-1',
                'tool-1',
                'test-tool',
                { param: 'value' }
            );
            expect(event.type).toBe(StreamEventType.MCP_TOOL_START);
            expect(event.toolCallId).toBe('tool-1');
            expect(event.toolName).toBe('test-tool');
            expect(event.params).toEqual({ param: 'value' });
            expect(event.messageId).toBe('msg-1');
            expect(event.timestamp).toBeDefined();
        });
    });
}); 