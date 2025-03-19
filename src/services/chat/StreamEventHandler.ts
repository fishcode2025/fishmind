export enum StreamEventType {
  // === 会话生命周期事件 ===
  SESSION_START = "session_start", // 整个对话流程开始
  SESSION_END = "session_end", // 整个对话流程正常结束
  SESSION_ERROR = "session_error", // 对话流程发生错误

  // === 模型响应事件 ===
  MODEL_RESPONSE_WAITING = "model_response_waiting", // 等待模型响应中
  MODEL_GENERATION_STOP = "model_generation_stop", // 模型主动停止生成

  // === 基础响应事件 ===
  TEXT = "text", // 普通文本片段

  // === 工具调用事件 ===
  TOOL_ARGS_START = "tool_args_start", // 工具调用开始收集参数
  TOOL_ARGS_COMPLETE = "tool_args_complete", // 工具参数收集完成

  // === MCP工具执行事件 ===
  MCP_TOOL_START = "mcp_tool_start", // MCP工具开始执行
  MCP_TOOL_EXECUTING = "mcp_tool_executing", // MCP工具执行中
  MCP_TOOL_SUCCESS = "mcp_tool_success", // MCP工具执行成功
  MCP_TOOL_ERROR = "mcp_tool_error", // MCP工具执行失败
  MCP_TOOL_TIMEOUT = "mcp_tool_timeout", // 工具执行超时

  // === 工具链事件 ===
  TOOL_CHAIN_START = "tool_chain_start", // 开始一系列工具调用
  TOOL_CHAIN_COMPLETE = "tool_chain_complete", // 完成所有工具调用

  // === 控制事件 ===
  ABORT = "abort", // 中止整个流程
  DONE = "done", // 对话完成
}

// 基础事件接口
interface BaseStreamEvent {
  type: StreamEventType;
  timestamp: number;
  messageId: string;
}

// 会话事件接口
interface SessionEvent extends BaseStreamEvent {
  type:
    | StreamEventType.SESSION_START
    | StreamEventType.SESSION_END
    | StreamEventType.SESSION_ERROR;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 模型事件接口
interface ModelEvent extends BaseStreamEvent {
  type:
    | StreamEventType.MODEL_RESPONSE_WAITING
    | StreamEventType.MODEL_GENERATION_STOP;
}

// 文本事件接口
interface TextEvent extends BaseStreamEvent {
  type: StreamEventType.TEXT;
  content: string;
}

// 工具事件接口
interface ToolEvent extends BaseStreamEvent {
  type:
    | StreamEventType.TOOL_ARGS_START
    | StreamEventType.TOOL_ARGS_COMPLETE
    | StreamEventType.MCP_TOOL_START
    | StreamEventType.MCP_TOOL_EXECUTING
    | StreamEventType.MCP_TOOL_SUCCESS
    | StreamEventType.MCP_TOOL_ERROR
    | StreamEventType.MCP_TOOL_TIMEOUT;
  toolCallId: string;
  toolName: string;
  params?: any;
  result?: any;
  error?: string;
  progress?: number;
  parentToolCallId?: string;
}

// 工具链事件接口
interface ToolChainEvent extends BaseStreamEvent {
  type: StreamEventType.TOOL_CHAIN_START | StreamEventType.TOOL_CHAIN_COMPLETE;
  toolCallIds: string[];
}

// 控制事件接口
interface ControlEvent extends BaseStreamEvent {
  type: StreamEventType.ABORT | StreamEventType.DONE;
  reason?: string;
}

// 统一导出的事件类型
export type StreamEvent =
  | SessionEvent
  | ModelEvent
  | TextEvent
  | ToolEvent
  | ToolChainEvent
  | ControlEvent;

// 事件类型验证函数
export function validateEventType(event: StreamEvent): boolean {
  // 验证基础字段
  if (!event.type || !event.timestamp || !event.messageId) {
    return false;
  }

  // 根据事件类型验证特定字段
  switch (event.type) {
    case StreamEventType.TEXT:
      return typeof (event as TextEvent).content === "string";

    case StreamEventType.TOOL_ARGS_START:
    case StreamEventType.TOOL_ARGS_COMPLETE:
    case StreamEventType.MCP_TOOL_START:
    case StreamEventType.MCP_TOOL_EXECUTING:
    case StreamEventType.MCP_TOOL_SUCCESS:
    case StreamEventType.MCP_TOOL_ERROR:
    case StreamEventType.MCP_TOOL_TIMEOUT:
      return (
        !!(event as ToolEvent).toolCallId && !!(event as ToolEvent).toolName
      );

    case StreamEventType.TOOL_CHAIN_START:
    case StreamEventType.TOOL_CHAIN_COMPLETE:
      return Array.isArray((event as ToolChainEvent).toolCallIds);

    default:
      return true;
  }
}

// 事件工厂函数
export class StreamEventFactory {
  static createSessionStart(messageId: string): SessionEvent {
    return {
      type: StreamEventType.SESSION_START,
      timestamp: Date.now(),
      messageId,
    };
  }

  static createSessionEnd(messageId: string): SessionEvent {
    return {
      type: StreamEventType.SESSION_END,
      timestamp: Date.now(),
      messageId,
    };
  }

  static createSessionError(messageId: string, error: Error): SessionEvent {
    return {
      type: StreamEventType.SESSION_ERROR,
      timestamp: Date.now(),
      messageId,
      error: {
        code: "STREAM_ERROR",
        message: error.message,
        details: error,
      },
    };
  }

  static createTextEvent(messageId: string, content: string): TextEvent {
    return {
      type: StreamEventType.TEXT,
      timestamp: Date.now(),
      messageId,
      content,
    };
  }

  static createToolEvent(
    type:
      | StreamEventType.TOOL_ARGS_START
      | StreamEventType.TOOL_ARGS_COMPLETE
      | StreamEventType.MCP_TOOL_START
      | StreamEventType.MCP_TOOL_EXECUTING
      | StreamEventType.MCP_TOOL_SUCCESS
      | StreamEventType.MCP_TOOL_ERROR
      | StreamEventType.MCP_TOOL_TIMEOUT,
    messageId: string,
    toolCallId: string,
    toolName: string,
    data?: any
  ): ToolEvent {
    return {
      type,
      timestamp: Date.now(),
      messageId,
      toolCallId,
      toolName,
      params: data?.params,
      result: data?.result,
      error: data?.error,
      progress: data?.progress,
    };
  }

  /**
   * 创建工具链事件
   * @param type 事件类型
   * @param messageId 消息ID
   * @param toolCallIds 工具调用ID列表（可选）
   * @returns 工具链事件
   */
  static createToolChainEvent(
    type:
      | StreamEventType.TOOL_CHAIN_START
      | StreamEventType.TOOL_CHAIN_COMPLETE,
    messageId: string,
    toolCallIds?: string[]
  ): ToolChainEvent {
    return {
      type,
      messageId,
      toolCallIds: toolCallIds || [],
      timestamp: Date.now(),
    };
  }

  static createControlEvent(
    type: StreamEventType.ABORT | StreamEventType.DONE,
    messageId: string,
    reason?: string
  ): ControlEvent {
    return {
      type,
      timestamp: Date.now(),
      messageId,
      reason,
    };
  }

  /**
   * 创建模型响应等待事件
   * @param messageId 消息ID
   * @returns 模型响应等待事件
   */
  static createModelResponseWaiting(messageId: string): StreamEvent {
    return {
      type: StreamEventType.MODEL_RESPONSE_WAITING,
      messageId,
      timestamp: Date.now(),
    };
  }
}
