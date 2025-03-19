```mermaid
flowchart TD
    Start([开始]) --> ValidateAndPrepare[validateAndPrepareMessages<br>验证话题并准备消息]
    ValidateAndPrepare --> DetermineModel[determineModel<br>确定使用的模型]
    DetermineModel --> CreateInitialMessage[createInitialAssistantMessage<br>创建初始助手消息]
    
    CreateInitialMessage --> PrepareRequestData[prepareRequestData<br>准备请求数据]
    
    subgraph PrepareRequestData[prepareRequestData 准备请求数据]
        GetAdapter[getModelAdapter<br>获取模型适配器] --> PrepareMessages[modelAdapter.prepareMessages<br>准备请求消息]
        PrepareMessages --> BuildHeaders[buildHeaders<br>构建请求头]
        BuildHeaders --> PrepareTools[prepareTools<br>准备工具列表]
    end
    
    PrepareRequestData --> HandleStream[handleStreamResponse<br>处理流式响应]
    
    subgraph HandleStream[handleStreamResponse 处理流式响应]
        SendRequest[fetch<br>发送API请求] --> ProcessChunks[processStreamResponse<br>处理响应数据块]
        ProcessChunks --> CheckToolCalls{processStreamChunk<br>检查是否有工具调用}
        
        CheckToolCalls -->|是| HandleToolCall[handleStandardToolCall<br>处理工具调用]
        HandleToolCall --> ExecuteTools[mcpToolHandler.handleToolCalls<br>执行工具]
        ExecuteTools --> SendToolResults[StreamEventType.TOOL_RESULT<br>发送工具结果事件]
        SendToolResults --> ProcessToolResponse[handleStreamToolCalls<br>处理工具响应]
        ProcessToolResponse --> EmitContent[StreamEventType.TEXT<br>发送内容事件]
        
        CheckToolCalls -->|否| EmitContent
    end
    
    HandleStream --> UpdateMessageAndTopic[updateMessageAndTopic<br>更新消息和话题]
    
    UpdateMessageAndTopic --> Error{是否出错?}
    Error -->|是| HandleError[handleStreamError<br>处理错误]
    Error -->|否| Success[return updatedMessage<br>返回更新后的消息]
    
    HandleError --> End([结束])
    Success --> End
    
    %% 事件通知
    style EmitContent fill:#f9f,stroke:#333,stroke-width:2px
    style SendToolResults fill:#f9f,stroke:#333,stroke-width:2px
    
    %% 错误处理
    style Error fill:#ff9999,stroke:#333,stroke-width:2px
    style HandleError fill:#ff9999,stroke:#333,stroke-width:2px
    
    %% 主要流程
    style Start fill:#9f9,stroke:#333,stroke-width:2px
    style End fill:#9f9,stroke:#333,stroke-width:2px
    ```

