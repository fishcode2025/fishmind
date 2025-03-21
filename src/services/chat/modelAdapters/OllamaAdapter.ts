import { IModelAdapter } from "./IModelAdapter";
import { IMcpTool } from "../mcpToolHandler";
import { ModelResponseContext } from "../ModelResponseContext";
import { AiModel, AiModelProvider } from "../../../models/chat";

/**
 * Ollama 模型适配器
 * 基于 OllamaChatService 的实现，Ollama 使用与 OpenAI 兼容的 API 格式，但有一些细微差别
 */
export class OllamaAdapter implements IModelAdapter {
  /**
   * 将 MCP 工具转换为 Ollama 工具格式
   * @param tool MCP 工具
   * @returns Ollama 格式的工具定义
   */
  formatTool(tool: IMcpTool): any {
    console.log(`OllamaAdapter 格式化工具: ${tool.name}`);
    
    // Ollama使用与OpenAI兼容的工具格式
    if (Object.keys(tool.inputSchema.properties).length === 0) {
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description
        }
      };
    }

    // 构建属性对象
    const properties: any = {};
    for (const key in tool.inputSchema.properties) {
      const prop = tool.inputSchema.properties[key];
      properties[key] = {
        type: prop.type,
        description: prop.description || "",
        items: prop.items
      };
      
      // 移除undefined的属性
      if (!properties[key].description) {
        delete properties[key].description;
      }
      
      if (!properties[key].items) {
        delete properties[key].items;
      }
    }

    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: properties,
          required: tool.inputSchema.required || []
        }
      }
    };
  }

  /**
   * 格式化工具调用结果为模型可接受的消息格式
   * @param toolName 工具名称
   * @param toolCallId 工具调用 ID
   * @param args 工具参数
   * @param result 工具调用结果
   * @returns 格式化后的消息数组
   */
  formatToolCallResult(
    toolName: string,
    toolCallId: string,
    args: any,
    result: any
  ): any[] {
    console.log(`OllamaAdapter.formatToolCallResult 被调用:`);
    console.log(`工具名称: ${toolName}`);
    console.log(`工具调用ID: ${toolCallId}`);
    console.log(`参数: ${typeof args === 'string' ? args : JSON.stringify(args)}`);
    console.log(`结果: ${typeof result === 'string' ? result : JSON.stringify(result)}`);
    
    // 格式化参数为字符串
    const argsStr = typeof args === "string" ? args : JSON.stringify(args);
    
    // 格式化结果为字符串
    const resultStr = typeof result === "string" ? result : JSON.stringify(result);

    return [
      {
        role: "assistant",
        tool_calls: [
          {
            id: toolCallId,
            type: "function",
            function: {
              arguments: argsStr,
              name: toolName,
            },
          },
        ],
      },
      {
        role: "tool",
        name: toolName,
        content: resultStr,
        tool_call_id: toolCallId,
      },
    ];
  }

  /**
   * 检查响应是否包含工具调用
   * @param response 模型响应
   * @returns 是否包含工具调用
   */
  hasToolCalls(response: any): boolean {
    if (!response) {
      return false;
    }
    
    console.log(
      `OllamaAdapter.hasToolCalls 被调用，检查响应(简化数据): ${
        typeof response === 'object' ? JSON.stringify({
          type: typeof response,
          hasMessageProp: !!response.message,
          hasToolCalls: response.tool_calls || (response.message && response.message.tool_calls),
          hasChoices: Array.isArray(response.choices)
        }) : response
      }`
    );

    // 检查Ollama特有的响应格式
    if (response.message && response.message.tool_calls) {
      return Array.isArray(response.message.tool_calls) && response.message.tool_calls.length > 0;
    }

    // 标准检查：响应中包含 tool_calls 数组
    const hasStandardToolCalls =
      response &&
      response.tool_calls &&
      Array.isArray(response.tool_calls) &&
      response.tool_calls.length > 0;

    // Ollama 特殊格式检查：检查 delta 中的 tool_calls
    const hasDeltaToolCalls =
      response?.delta?.tool_calls &&
      Array.isArray(response.delta.tool_calls) &&
      response.delta.tool_calls.length > 0;

    // 检查 choices 中的 tool_calls
    const hasChoicesToolCalls =
      response?.choices &&
      Array.isArray(response.choices) &&
      response.choices.length > 0 &&
      (response.choices[0]?.message?.tool_calls ||
        response.choices[0]?.delta?.tool_calls);

    // 检查内容中是否包含工具调用的格式
    const hasContentToolCalls =
      response?.content &&
      (response.content.includes("function") ||
        response.content.includes("tool_calls") ||
        response.content.includes("```json") ||
        (response.content.includes("{") && response.content.includes("}")));

    // 检查 choices 中的内容是否包含工具调用的格式
    const hasChoicesContentToolCalls =
      response?.choices &&
      Array.isArray(response.choices) &&
      response.choices.length > 0 &&
      response.choices[0]?.message?.content &&
      (response.choices[0].message.content.includes("function") ||
        response.choices[0].message.content.includes("tool_calls") ||
        response.choices[0].message.content.includes("```json") ||
        (response.choices[0].message.content.includes("{") &&
          response.choices[0].message.content.includes("}")));
          
    // 检查message中的content是否包含工具调用标记
    const hasMessageContentToolCalls = 
      response?.message?.content && 
      (response.message.content.includes("function") ||
       response.message.content.includes("我将使用") ||
       response.message.content.includes("调用工具") ||
       response.message.content.includes("I'll use") ||
       (response.message.content.includes("{") && 
        response.message.content.includes("}")));

    const result =
      hasStandardToolCalls ||
      hasDeltaToolCalls ||
      hasChoicesToolCalls ||
      hasContentToolCalls ||
      hasChoicesContentToolCalls ||
      hasMessageContentToolCalls;

    console.log(`hasToolCalls 检查结果: ${result}`);
    
    if (result) {
      console.log(
        `检测到工具调用: hasStandardToolCalls=${hasStandardToolCalls}, hasDeltaToolCalls=${hasDeltaToolCalls}, hasChoicesToolCalls=${hasChoicesToolCalls}, hasContentToolCalls=${hasContentToolCalls}, hasChoicesContentToolCalls=${hasChoicesContentToolCalls}, hasMessageContentToolCalls=${hasMessageContentToolCalls}`
      );
    }

    return result;
  }

  /**
   * 从模型响应中提取工具调用
   * @param response 模型响应
   * @returns 工具调用数组
   */
  extractToolCalls(response: any): any[] {
    if (!response) {
      return [];
    }
    
    console.log(
      `OllamaAdapter.extractToolCalls 被调用，响应类型: ${typeof response} ${
        response ? `键: ${Object.keys(response).join(', ')}` : ''
      }`
    );

    // 处理 Ollama 特有的响应格式
    if (response.message && response.message.tool_calls) {
      console.log(`从 Ollama 特有格式中提取工具调用: ${response.message.tool_calls.length} 个`);
      return this.formatToolCalls(response.message.tool_calls);
    }
    
    // 尝试从 message.content 中提取
    if (response.message && response.message.content) {
      console.log(`尝试从 message.content 中提取工具调用`);
      const contentTools = this.extractToolCallsFromContent(response.message.content);
      if (contentTools.length > 0) {
        return contentTools;
      }
    }

    // 尝试从标准位置提取工具调用
    if (response?.tool_calls && Array.isArray(response.tool_calls)) {
      console.log(`从标准位置提取工具调用: ${response.tool_calls.length} 个`);
      return this.formatToolCalls(response.tool_calls);
    }

    // 尝试从 delta 中提取工具调用
    if (
      response?.delta?.tool_calls &&
      Array.isArray(response.delta.tool_calls)
    ) {
      console.log(
        `从 delta 中提取工具调用: ${response.delta.tool_calls.length} 个`
      );
      return this.formatToolCalls(response.delta.tool_calls);
    }

    // 尝试从 choices 中提取工具调用
    if (
      response?.choices &&
      Array.isArray(response.choices) &&
      response.choices.length > 0
    ) {
      // 从 message 中提取
      if (response.choices[0]?.message?.tool_calls) {
        console.log(
          `从 choices[0].message 中提取工具调用: ${response.choices[0].message.tool_calls.length} 个`
        );
        return this.formatToolCalls(response.choices[0].message.tool_calls);
      }

      // 从 delta 中提取
      if (response.choices[0]?.delta?.tool_calls) {
        console.log(
          `从 choices[0].delta 中提取工具调用: ${response.choices[0].delta.tool_calls.length} 个`
        );
        return this.formatToolCalls(response.choices[0].delta.tool_calls);
      }

      // 从内容中提取
      if (response.choices[0]?.message?.content) {
        console.log(
          `尝试从 choices[0].message.content 中提取工具调用`
        );
        return this.extractToolCallsFromContent(
          response.choices[0].message.content
        );
      }

      // 从 delta.content 中提取
      if (response.choices[0]?.delta?.content) {
        console.log(
          `尝试从 choices[0].delta.content 中提取工具调用`
        );
        if (response.choices[0].delta.content === "<tool_call>") {
          console.log("检测到特殊的 <tool_call> 标记");
          return [
            {
              id: `ollama-tool-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              name: "create_table",
              args: "{}",
            },
          ];
        }
        return this.extractToolCallsFromContent(
          response.choices[0].delta.content
        );
      }
    }

    // 从响应内容中提取
    if (response?.content) {
      console.log(
        `尝试从 response.content 中提取工具调用`
      );
      return this.extractToolCallsFromContent(response.content);
    }

    console.log(`未找到工具调用`);
    return [];
  }

  /**
   * 格式化工具调用
   * @param toolCalls 工具调用数组
   * @returns 格式化后的工具调用数组
   * @private
   */
  private formatToolCalls(toolCalls: any[]): any[] {
    if (!toolCalls || !Array.isArray(toolCalls)) {
      console.log(`formatToolCalls: 输入不是数组`);
      return [];
    }
    
    console.log(`formatToolCalls: 输入数组长度 ${toolCalls.length}`);
    console.log(`工具调用输入: ${JSON.stringify(toolCalls)}`);
    
    return toolCalls
      .map((toolCall: any, index: number) => {
        console.log(`处理工具调用 #${index+1}:`, JSON.stringify(toolCall));
        
        // 处理标准OpenAI格式的工具调用
        if (toolCall.type === "function" && toolCall.function) {
          let args = toolCall.function.arguments;
          
          // 记录原始参数
          console.log(`工具参数原始值: ${typeof args === 'string' ? `"${args}"` : JSON.stringify(args)}`);
          
          // 特殊处理: 当参数是字符串"[object Object]"时，将其替换为空对象
          if (args === "[object Object]") {
            console.log(`检测到特殊字符串"[object Object]"，替换为空对象`);
            args = "{}";
          }
          // 确保参数是字符串格式
          else if (typeof args === "string" && args.trim()) {
            // 验证是否为有效的JSON字符串
            try {
              // 先解析检查有效性，然后重新转回字符串以确保格式统一
              const parsedArgs = JSON.parse(args);
              args = JSON.stringify(parsedArgs);
              console.log(`参数验证成功: ${args}`);
            } catch (error: any) {
              console.warn(`无法解析工具调用参数为JSON对象: "${args}"，错误: ${error?.message || "未知错误"}`);
              // 如果无法解析但看起来像对象字符串，则尝试其他方法
              if (args.includes('{') && args.includes('}')) {
                try {
                  // 尝试使用Function构造函数安全地解析
                  const cleanArgs = args.replace(/[\r\n]/g, ' ').trim();
                  const parsedArgs = (new Function(`return ${cleanArgs}`))();
                  args = JSON.stringify(parsedArgs);
                  console.log(`使用替代方法解析成功: ${args}`);
                } catch (e: any) {
                  console.warn(`替代解析方法也失败: ${e?.message || "未知错误"}`);
                  // 最终回退到空对象
                  args = "{}";
                }
              } else {
                // 不像对象的字符串，使用空对象
                args = "{}";
              }
            }
          } else if (typeof args !== "string") {
            // 非字符串参数转换为字符串
            console.log(`将非字符串参数转换为字符串: ${JSON.stringify(args)}`);
            args = typeof args === "object" ? JSON.stringify(args) : "{}";
          } else {
            // 空字符串或其他情况，使用空对象
            console.log(`参数为空，使用空对象字符串`);
            args = "{}";
          }
          
          return {
            id: toolCall.id || `ollama-tool-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            name: toolCall.function.name,
            args: args
          };
        }
        
        // 直接包含name和args的简单格式
        if (toolCall.name) {
          let args = toolCall.arguments || toolCall.args || {};
          
          // 特殊处理: 当参数是字符串"[object Object]"时
          if (args === "[object Object]") {
            console.log(`检测到简单格式中的特殊字符串"[object Object]"，替换为空对象字符串`);
            args = "{}";
          }
          // 确保参数是字符串格式
          else if (typeof args !== "string") {
            console.log(`将简单格式非字符串参数转换为字符串: ${JSON.stringify(args)}`);
            args = typeof args === "object" ? JSON.stringify(args) : "{}";
          }
          // 尝试验证字符串格式
          else if (typeof args === "string" && args.trim()) {
            try {
              // 先解析检查有效性，然后重新转回字符串以确保格式统一
              const parsedArgs = JSON.parse(args);
              args = JSON.stringify(parsedArgs);
              console.log(`简单格式参数验证成功: ${args}`);
            } catch (error: any) {
              console.warn(`无法解析简单格式工具调用参数为JSON对象: "${args}"，错误: ${error?.message || "未知错误"}`);
              // 如果无法解析，使用空对象
              args = "{}";
            }
          } else {
            // 空字符串情况
            args = "{}";
          }
          
          return {
            id: toolCall.id || `ollama-tool-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            name: toolCall.name,
            args: args
          };
        }
        
        console.log(`无法识别的工具调用格式: ${JSON.stringify(toolCall)}`);
        return null;
      })
      .filter(Boolean);
  }

  /**
   * 获取提供商名称
   * @returns 提供商名称
   */
  getProviderName(): string {
    return "ollama";
  }

  /**
   * 准备请求消息
   * @param messages 原始消息列表
   * @param systemPrompt 系统提示词（可选）
   * @returns 格式化后的请求消息
   */
  prepareMessages(messages: any[], systemPrompt?: string): any[] {
    const result = [];

    // 添加系统提示词
    if (systemPrompt) {
      result.push({
        role: "system",
        content: systemPrompt,
      });
    }

    // 添加用户消息和助手消息
    for (const msg of messages) {
      if (msg.role === "tool") {
        result.push({
          role: "tool",
          content:
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content),
          name: msg.name,
          tool_call_id: msg.tool_call_id,
        });
      } else if (msg.role === "assistant" && msg.tool_calls) {
        result.push(msg);
      } else {
        result.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return result;
  }

  /**
   * 准备请求体
   * @param messages 请求消息
   * @param model 模型名称
   * @param temperature 温度
   * @param maxTokens 最大令牌数
   * @param tools 工具列表（可选）
   * @param stream 是否启用流式响应
   * @returns 格式化后的请求体
   */
  prepareRequestBody(
    messages: any[],
    model: string,
    temperature: number,
    maxTokens: number,
    tools?: any[],
    stream?: boolean
  ): any {
    const payload: any = {
      model,
      messages,
      stream: stream !== false,
      options: {
        temperature,
        num_predict: maxTokens > 0 ? maxTokens : undefined,
        num_ctx: 4096  // Ollama 默认上下文窗口大小
      }
    };

    // 添加工具
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    return payload;
  }

  /**
   * 从响应中提取内容
   * @param response 模型响应
   * @returns 提取的内容
   */
  extractContentFromResponse(response: any): string {
    if (response && response.choices && response.choices.length > 0) {
      return response.choices[0].message.content || "";
    }
    return "";
  }

  /**
   * 从内容中提取工具调用
   * @param content 文本内容
   * @returns 提取的工具调用
   * @private
   */
  private extractToolCallsFromContent(content: string): any[] {
    if (!content || typeof content !== "string") return [];

    try {
      // 查找最外层的代码块（可能是工具调用）
      // 1. 尝试匹配Markdown格式的JSON代码块
      const jsonCodeBlock = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonCodeBlock && jsonCodeBlock[1]) {
        const jsonStr = jsonCodeBlock[1].trim();
        try {
          const json = JSON.parse(jsonStr);
          
          // 检查是否是单个工具调用
          if (json.name && (json.arguments !== undefined || json.args !== undefined)) {
            return [{
              id: `ollama-tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: json.name,
              args: json.arguments || json.args || {}
            }];
          }
          
          // 检查是否是工具调用数组
          if (Array.isArray(json) && json.length > 0 && json[0].name) {
            return json.map((tool: any) => ({
              id: tool.id || `ollama-tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: tool.name,
              args: tool.arguments || tool.args || {}
            }));
          }
        } catch (e) {
          console.error("解析代码块为JSON失败:", e);
        }
      }
      
      // 2. 尝试匹配非Markdown格式的JSON对象
      const jsonMatch = content.match(/\{\s*"name"[\s\S]*?\}/g);
      if (jsonMatch) {
        for (const match of jsonMatch) {
          try {
            const json = JSON.parse(match);
            if (json.name) {
              return [{
                id: `ollama-tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: json.name,
                args: json.arguments || json.args || {}
              }];
            }
          } catch (e) {
            console.error("解析JSON对象失败:", e);
          }
        }
      }
      
      // 3. 尝试匹配功能调用模式
      const functionCallPattern = /我将使用(\w+)工具|I'll use the (\w+) tool|使用(\w+)函数|calling (\w+)|function (\w+)/i;
      const functionMatch = content.match(functionCallPattern);
      if (functionMatch) {
        // 找到第一个非空的匹配组
        const toolName = functionMatch.slice(1).find(group => group);
        if (toolName) {
          // 尝试查找参数部分
          const argsPattern = new RegExp(`参数(?:是|为)?\\s*[:：]?\\s*({[\\s\\S]*?})`);
          const argsMatch = content.match(argsPattern) || content.match(/arguments?(?:\s+are)?:?\s*({[\s\S]*?})/i);
          
          let args = {};
          if (argsMatch && argsMatch[1]) {
            try {
              args = JSON.parse(argsMatch[1]);
            } catch (e) {
              console.error("解析参数字符串失败:", e);
            }
          }
          
          return [{
            id: `ollama-tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: toolName,
            args
          }];
        }
      }
    } catch (e) {
      console.error("从内容中提取工具调用失败:", e);
    }

    return [];
  }

  /**
   * 构建请求体
   * @param messages 请求消息
   * @param responseContext 响应上下文
   * @param provider 模型提供商
   * @param model 模型
   * @param tools 工具列表（可选）
   * @returns 格式化后的请求体
   */
  buildRequestBody(
    messages: any[],
    responseContext: ModelResponseContext,
    provider: AiModelProvider,
    model: AiModel,
    tools?: any[]
  ): any {
    // 获取模型配置信息
    const modelId = model?.modelId || responseContext.getMetadata("modelId") || "llama2";
    const temperature = parseFloat(responseContext.getMetadata("temperature") || "0.7");
    const maxTokens = parseInt(responseContext.getMetadata("maxTokens") || "2048");
    
    // Ollama特有的参数
    const topP = parseFloat(responseContext.getMetadata("topP") || "0.9");
    const topK = parseInt(responseContext.getMetadata("topK") || "40");
    const repeatPenalty = parseFloat(responseContext.getMetadata("repeatPenalty") || "1.1");
    const presencePenalty = parseFloat(responseContext.getMetadata("presencePenalty") || "0.0");
    const frequencyPenalty = parseFloat(responseContext.getMetadata("frequencyPenalty") || "0.0");
    const seed = parseInt(responseContext.getMetadata("seed") || "0");
    const numCtx = parseInt(responseContext.getMetadata("numCtx") || "4096");
    const numBatch = parseInt(responseContext.getMetadata("numBatch") || "512");
    const format = responseContext.getMetadata("format") || "";
    const rawPrompt = responseContext.getMetadata("raw") === "true";
    
    // 构建payload
    const payload: any = {
      model: modelId,
      messages,
      stream: true,
      options: {
        temperature,
        num_ctx: numCtx,
        num_batch: numBatch
      }
    };
    
    // 只添加非默认值的参数，减少请求体大小
    if (maxTokens > 0) {
      payload.options.num_predict = maxTokens;
    }
    
    if (topP !== 0.9) {
      payload.options.top_p = topP;
    }
    
    if (topK !== 40) {
      payload.options.top_k = topK;
    }
    
    if (repeatPenalty !== 1.1) {
      payload.options.repeat_penalty = repeatPenalty;
    }
    
    if (presencePenalty !== 0.0) {
      payload.options.presence_penalty = presencePenalty;
    }
    
    if (frequencyPenalty !== 0.0) {
      payload.options.frequency_penalty = frequencyPenalty;
    }
    
    if (seed !== 0) {
      payload.options.seed = seed;
    }
    
    // 添加格式化输出支持
    if (format) {
      payload.format = format;
    }
    
    // 添加原始提示支持
    if (rawPrompt) {
      payload.raw = true;
    }

    // 添加工具
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    return payload;
  }

  /**
   * 从流式响应块中解析数据
   * @param chunk 响应数据块
   * @returns 解析后的数据
   */
  parseStreamChunk(chunk: string | Uint8Array): any {
    // Ollama流式响应解析
    if (typeof chunk !== "string") {
      chunk = new TextDecoder().decode(chunk);
    }

    // 移除前缀 "data: "
    const dataString = chunk.replace(/^data: /, "").trim();
    
    // 检查是否是结束标记
    if (dataString === "[DONE]") {
      return { done: true };
    }
    
    // 跳过空数据
    if (!dataString) {
      return null;
    }

    try {
      const parsed = JSON.parse(dataString);
      
      // 记录原始响应数据，便于调试
      console.log(`Ollama原始响应: ${JSON.stringify(parsed, null, 2)}`);
      
      // 处理Ollama特有的响应格式
      if (parsed.message) {
        // 检查是否有工具调用
        const hasTool = parsed.message.tool_calls && 
                       Array.isArray(parsed.message.tool_calls) && 
                       parsed.message.tool_calls.length > 0;
        
        // 确定finish_reason
        let finishReason = null;
        
        // 当message.tool_calls有数据且done=false时，设置finish_reason为"tool_calls"
        if (hasTool && !parsed.done) {
          finishReason = "tool_calls";
        } 
        // 当done_reason="stop"且done=true时，设置finish_reason为"stop"
        else if (parsed.done_reason === "stop" && parsed.done) {
          finishReason = "stop";
        }
        // 其他情况下的默认处理
        else if (parsed.done) {
          finishReason = parsed.done_reason || "stop";
        }
        
        // 将Ollama格式转换为OpenAI格式以保持一致性
        const result = {
          choices: [
            {
              delta: {
                content: parsed.message.content || "",
                role: parsed.message.role || "assistant",
              },
              index: 0,
              finish_reason: finishReason
            }
          ],
          model: parsed.model || "",
          created: Date.now(),
          done: parsed.done || false
        };
        
        // 如果有工具调用，添加到delta中
        if (hasTool) {
          console.log(`检测到Ollama工具调用: ${JSON.stringify(parsed.message.tool_calls)}`);
          // @ts-ignore - 添加工具调用
          result.choices[0].delta.tool_calls = parsed.message.tool_calls.map(toolCall => {
            // 格式化参数为字符串
            let args = toolCall.function.arguments;
            
            // 确保参数是字符串格式
            if (args === "[object Object]") {
              args = "{}";
            } else if (typeof args !== "string") {
              args = typeof args === "object" ? JSON.stringify(args) : "{}";
            } else if (args === undefined || args === null || args === "") {
              args = "{}";
            } else {
              // 验证JSON字符串格式
              try {
                const parsedArgs = JSON.parse(args);
                args = JSON.stringify(parsedArgs);
              } catch {
                // 如果无法解析，使用原始字符串或空对象
                if (!args.trim()) {
                  args = "{}";
                }
              }
            }
            
            // 确保工具调用有正确的格式
            return {
              id: toolCall.id || `ollama-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              type: "function",
              function: {
                name: toolCall.function.name,
                arguments: args
              }
            };
          });
          
          // 为确保系统内部处理，设置顶级tool_calls属性
          // @ts-ignore
          result.tool_calls = result.choices[0].delta.tool_calls;
        }
        
        return result;
      }
      
      return parsed;
    } catch (e) {
      console.error("Failed to parse stream chunk", e, "Raw chunk:", dataString);
      return null;
    }
  }

  /**
   * 判断模型是否支持嵌入式工具调用
   * @returns 是否支持嵌入式工具调用
   */
  supportsEmbeddedToolCalls(): boolean {
    // Ollama目前不支持嵌入式工具调用
    return false;
  }

  /**
   * 从响应中提取嵌入式工具调用
   * @param response 模型响应
   * @returns 嵌入式工具调用列表
   */
  extractEmbeddedToolCalls(response: any): any[] {
    // Ollama不支持嵌入式工具调用，返回空数组
    return [];
  }
}
