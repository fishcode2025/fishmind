执行计划
第一阶段：基础集成
修改 ChatService 构造函数，添加 McpToolHandler
实现基本的模型适配器接口和几个主要供应商的适配器
第二阶段：工具调用实现
修改 generateAiReply 方法，添加工具调用支持
实现工具调用结果处理和回传
第三阶段：流式响应支持
修改 generateAiReplyStream 方法，支持流式工具调用
处理流式响应中的工具调用特殊情况
第四阶段：UI 集成
创建工具调用显示组件
更新消息显示组件以支持工具调用
添加工具调用状态指示器
第五阶段：测试与优化
测试不同供应商的工具调用
优化性能和用户体验
添加错误处理和重试机制
这个计划将使您能够逐步将 MCP 工具集成到现有的聊天服务中，同时保持代码的清晰和可维护性。每个阶段都可以独立测试和验证，确保整个集成过程顺利进行。