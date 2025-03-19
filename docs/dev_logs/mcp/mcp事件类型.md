export enum StreamEventType {
    // === 会话生命周期事件 ===
    SESSION_START = 'session_start',         // 整个对话流程开始
    SESSION_END = 'session_end',             // 整个对话流程正常结束
    SESSION_ERROR = 'session_error',         // 对话流程发生错误

    // === 模型响应事件 ===
    MODEL_RESPONSE_WAITING = 'model_response_waiting',  // 等待模型响应中
    MODEL_GENERATION_STOP = 'model_generation_stop',    // 模型主动停止生成
    
    // === 基础响应事件 ===
    TEXT = 'text',                           // 普通文本片段
    
    // === 工具调用事件 ===
    TOOL_ARGS_START = 'tool_args_start',     // 工具调用开始收集参数
    TOOL_ARGS_COMPLETE = 'tool_args_complete', // 工具参数收集完成
    
    // === MCP工具执行事件 ===
    MCP_TOOL_START = 'mcp_tool_start',       // MCP工具开始执行
    MCP_TOOL_EXECUTING = 'mcp_tool_executing', // MCP工具执行中
    MCP_TOOL_SUCCESS = 'mcp_tool_success',   // MCP工具执行成功
    MCP_TOOL_ERROR = 'mcp_tool_error',       // MCP工具执行失败
    MCP_TOOL_TIMEOUT = 'mcp_tool_timeout',   // 工具执行超时
        
    // 添加工具链相关事件
    TOOL_CHAIN_START = 'tool_chain_start',       // 开始一系列工具调用
    TOOL_CHAIN_COMPLETE = 'tool_chain_complete', // 完成所有工具调用
    
    // === 控制事件 ===
    ABORT = 'abort',                         // 中止整个流程
    DONE = 'done'                           // 对话完成
}