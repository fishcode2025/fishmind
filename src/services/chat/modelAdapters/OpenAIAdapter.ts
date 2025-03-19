import { IModelAdapter } from "./IModelAdapter";
import { IMcpTool } from "../mcpToolHandler";
import { ModelResponseContext } from "../ModelResponseContext";

/**
 * OpenAI 模型适配器
 * 实现 OpenAI API 格式的工具调用
 */
export class OpenAIAdapter implements IModelAdapter {
  /**
   * 获取提供商名称
   * @returns 提供商名称
   */
  getProviderName(): string {
    return "openai";
  }

  /**
   * 格式化工具为 OpenAI 可用的格式
   * @param tool MCP工具
   * @returns 格式化后的工具
   */
  formatTool(tool: IMcpTool): any {
    console.log(`OpenAIAdapter 格式化工具: ${tool.name}`);
    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description.substring(0, 1000), // OpenAI 对描述长度有限制
        parameters: {
          type: tool.inputSchema.type,
          properties: tool.inputSchema.properties || {},
          required: tool.inputSchema.required || [],
          additionalProperties: false,
        },
      },
    };
  }

  /**
   * 检查响应是否包含工具调用
   * @param message 模型响应消息
   * @returns 是否包含工具调用
   */
  hasToolCalls(message: any): boolean {
    console.log(
      `OpenAIAdapter.hasToolCalls 被调用，检查响应(完整原始数据): ${JSON.stringify(
        message,
        null,
        2
      )}`
    );

    // 标准检查：响应中包含 tool_calls 数组
    const hasStandardToolCalls =
      message &&
      Array.isArray(message.tool_calls) &&
      message.tool_calls.length > 0;

    // 检查 delta 中的 tool_calls
    const hasDeltaToolCalls =
      message?.delta?.tool_calls &&
      Array.isArray(message.delta.tool_calls) &&
      message.delta.tool_calls.length > 0;

    // 检查旧版 function_call 格式
    const hasFunctionCall =
      message?.function_call || message?.delta?.function_call;

    // 检查内容是否为特殊标记
    const hasSpecialContent =
      message?.content === "<tool_call>" ||
      message?.delta?.content === "<tool_call>";

    // 检查内容中是否包含工具调用格式
    const hasContentToolCalls =
      message?.content &&
      (message.content.includes("function") ||
        message.content.includes("tool_calls") ||
        message.content.includes("```json") ||
        (message.content.includes("{") && message.content.includes("}")));

    // 检查 finish_reason 是否为 tool_calls 或 function_call
    const hasToolCallFinishReason =
      message?.choices?.[0]?.finish_reason === "tool_calls" ||
      message?.choices?.[0]?.finish_reason === "function_call";

    const result =
      hasStandardToolCalls ||
      hasDeltaToolCalls ||
      hasFunctionCall ||
      hasSpecialContent ||
      hasContentToolCalls ||
      hasToolCallFinishReason;

    console.log(`OpenAIAdapter.hasToolCalls 检查结果: ${result}`);
    console.log(
      `hasStandardToolCalls=${hasStandardToolCalls}, hasDeltaToolCalls=${hasDeltaToolCalls}, hasFunctionCall=${hasFunctionCall}, hasSpecialContent=${hasSpecialContent}, hasContentToolCalls=${hasContentToolCalls}, hasToolCallFinishReason=${hasToolCallFinishReason}`
    );

    return result;
  }

  /**
   * 从模型响应中提取工具调用
   * @param message 模型响应消息
   * @returns 工具调用列表
   */
  extractToolCalls(message: any): any[] {
    console.log(
      `OpenAIAdapter.extractToolCalls 被调用，响应(完整原始数据): ${JSON.stringify(
        message,
        null,
        2
      )}`
    );

    // 检查特殊的 <tool_call> 标记，支持带换行符的情况
    if (
      (message?.content &&
        (message.content.trim() === "<tool_call>" ||
          message.content.trim() === "<tool_call>\n" ||
          message.content.startsWith("<tool_call>"))) ||
      (message?.delta?.content &&
        (message.delta.content.trim() === "<tool_call>" ||
          message.delta.content.trim() === "<tool_call>\n" ||
          message.delta.content.startsWith("<tool_call>")))
    ) {
      console.log("检测到特殊的 <tool_call> 标记，但不创建默认工具调用");
      // 不创建默认工具调用，返回空数组
      return [];
    }

    // 标准工具调用格式
    if (
      message &&
      Array.isArray(message.tool_calls) &&
      message.tool_calls.length > 0
    ) {
      console.log(`从标准位置提取工具调用: ${message.tool_calls.length} 个`);
      const toolCalls = message.tool_calls.map((toolCall: any) => {
        try {
          const args =
            typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments || "{}")
              : toolCall.function.arguments || {};

          console.log(
            `提取工具调用: ID=${toolCall.id}, 名称=${
              toolCall.function.name
            }, 参数=${JSON.stringify(args)}`
          );

          return {
            id: toolCall.id,
            name: toolCall.function.name,
            args: args,
          };
        } catch (error) {
          console.error(`解析工具调用参数失败: ${error}`);
          return {
            id: toolCall.id,
            name: toolCall.function.name,
            args: {},
          };
        }
      });

      console.log(`提取到 ${toolCalls.length} 个工具调用`);
      return toolCalls;
    }

    // 从 delta 中提取工具调用
    if (
      message?.delta?.tool_calls &&
      Array.isArray(message.delta.tool_calls) &&
      message.delta.tool_calls.length > 0
    ) {
      console.log(
        `从 delta 中提取工具调用: ${message.delta.tool_calls.length} 个`
      );
      const toolCalls = message.delta.tool_calls.map((toolCall: any) => {
        try {
          const args =
            typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments || "{}")
              : toolCall.function.arguments || {};

          console.log(
            `提取 delta 工具调用: ID=${toolCall.id}, 名称=${
              toolCall.function.name
            }, 参数=${JSON.stringify(args)}`
          );

          return {
            id: toolCall.id,
            name: toolCall.function.name,
            args: args,
          };
        } catch (error) {
          console.error(`解析 delta 工具调用参数失败: ${error}`);
          return {
            id: toolCall.id,
            name: toolCall.function.name,
            args: {},
          };
        }
      });

      console.log(`从 delta 中提取到 ${toolCalls.length} 个工具调用`);
      return toolCalls;
    }

    // 检查旧版 function_call 格式
    if (message?.function_call || message?.delta?.function_call) {
      console.log("检测到旧版 function_call 格式");
      const functionCall =
        message?.function_call || message?.delta?.function_call;

      try {
        const name = functionCall.name;
        const args =
          typeof functionCall.arguments === "string"
            ? JSON.parse(functionCall.arguments || "{}")
            : functionCall.arguments || {};

        console.log(
          `提取 function_call: 名称=${name}, 参数=${JSON.stringify(args)}`
        );

        return [
          {
            id: `function-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            name: name,
            args: args,
          },
        ];
      } catch (error) {
        console.error(`解析 function_call 参数失败: ${error}`);
        return [
          {
            id: `function-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            name: functionCall.name,
            args: {},
          },
        ];
      }
    }

    // 尝试从内容中提取工具调用
    if (
      message?.content &&
      (message.content.includes("function") ||
        message.content.includes("```json"))
    ) {
      console.log(`尝试从内容中提取工具调用: ${message.content}`);
      try {
        // 尝试提取 JSON 代码块
        const jsonMatches = message.content.match(
          /```(?:json)?\s*({[\s\S]*?})\s*```/g
        );
        if (jsonMatches) {
          console.log(`找到 ${jsonMatches.length} 个 JSON 代码块`);

          const toolCalls = [];

          for (const match of jsonMatches) {
            // 提取 JSON 部分
            const jsonMatch = match.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
            if (!jsonMatch || !jsonMatch[1]) continue;

            try {
              const jsonStr = jsonMatch[1];
              const toolCallData = JSON.parse(jsonStr);

              if (toolCallData.name) {
                console.log(
                  `从 JSON 代码块中提取到工具调用: ${toolCallData.name}`
                );

                toolCalls.push({
                  id: `tool-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                  name: toolCallData.name,
                  args: toolCallData.parameters || {},
                });
              }
            } catch (error) {
              console.error(`解析 JSON 代码块失败:`, error);
            }
          }

          if (toolCalls.length > 0) {
            console.log(`从内容中提取到 ${toolCalls.length} 个工具调用`);
            return toolCalls;
          }
        }
      } catch (error) {
        console.error(`从内容中提取工具调用失败:`, error);
      }
    }

    // 检查 finish_reason 是否为 tool_calls 或 function_call
    if (
      message?.choices?.[0]?.finish_reason === "tool_calls" ||
      message?.choices?.[0]?.finish_reason === "function_call"
    ) {
      console.log(
        `检测到 finish_reason 为 ${message.choices[0].finish_reason}，但未找到工具调用数据`
      );
      // 不创建默认工具调用，返回空数组
      return [];
    }

    console.log("未找到工具调用");
    return [];
  }

  /**
   * 格式化工具调用结果为 OpenAI 可用的格式
   * @param toolName 工具名称
   * @param toolCallId 工具调用ID
   * @param args 工具调用参数
   * @param result 工具调用结果
   * @returns 格式化后的工具调用结果消息
   */
  formatToolCallResult(
    toolName: string,
    toolCallId: string,
    args: any,
    result: any
  ): any[] {
    console.log(`OpenAIAdapter.formatToolCallResult 被调用:`);
    console.log(`工具名称: ${toolName}`);
    console.log(`工具调用ID: ${toolCallId}`);
    console.log(`参数: ${JSON.stringify(args, null, 2)}`);
    console.log(
      `结果: ${
        typeof result === "string" ? result : JSON.stringify(result, null, 2)
      }`
    );

    // 格式化参数为字符串
    const argsStr = typeof args === "string" ? args : JSON.stringify(args);

    // 格式化结果为字符串
    const resultStr =
      typeof result === "string" ? result : JSON.stringify(result);

    const formattedMessages = [
      {
        role: "assistant",
        tool_calls: [
          {
            id: toolCallId,
            type: "function",
            function: {
              name: toolName,
              arguments: argsStr,
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: toolCallId,
        name: toolName,
        content: resultStr,
      },
    ];

    console.log(
      `格式化后的消息: ${JSON.stringify(formattedMessages, null, 2)}`
    );
    return formattedMessages;
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
    console.log(`OpenAIAdapter.prepareRequestBody 被调用:`);
    console.log(`模型: ${model}`);
    console.log(`温度: ${temperature}`);
    console.log(`最大令牌数: ${maxTokens}`);
    console.log(`是否流式响应: ${stream}`);
    console.log(`工具数量: ${tools ? tools.length : 0}`);

    if (tools && tools.length > 0) {
      console.log(`工具列表: ${JSON.stringify(tools, null, 2)}`);
    }

    const payload: any = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: stream || false,
    };

    // 添加工具
    if (tools && tools.length > 0) {
      payload.tools = tools;

      // 设置工具选择策略
      // 'auto': 模型自行决定是否使用工具
      // 'required': 强制模型使用工具
      // 'none': 禁止模型使用工具
      payload.tool_choice = "auto";

      console.log(`设置工具选择策略: tool_choice=${payload.tool_choice}`);

      // 对于某些模型，可能需要使用 functions 而不是 tools
      if (model.includes("gpt-3.5-turbo") && !model.includes("0613")) {
        console.log(`检测到 GPT-3.5 模型，添加 function_call 参数`);

        // 将 tools 转换为 functions 格式
        payload.functions = tools.map((tool: any) => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        }));

        // 设置 function_call 参数
        payload.function_call = "auto";

        // 删除 tools 和 tool_choice 参数
        delete payload.tools;
        delete payload.tool_choice;

        console.log(
          `已转换为 functions API 格式: ${JSON.stringify(
            payload.functions,
            null,
            2
          )}`
        );
      }
    }

    console.log(`准备的请求体: ${JSON.stringify(payload, null, 2)}`);
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
   * 构建请求体
   * @param messages 请求消息
   * @param tools 工具列表（可选）
   * @param options 选项对象，包含responseContext
   * @returns 格式化后的请求体
   */
  buildRequestBody(
    messages: any[],
    responseContext: ModelResponseContext,
    tools?: any[]
  ): any {
    // 4. 从responseContext中补充缺失的信息
    const model = responseContext.getMetadata("name");

    const tempValue = responseContext.getMetadata("temperature");
    const temperature = tempValue ? parseFloat(tempValue) : 0.7;

    const tokensValue = responseContext.getMetadata("maxTokens");
    const maxTokens = tokensValue ? parseInt(tokensValue) : 2048;

    const streamValue = responseContext.getMetadata("stream");
    const stream = streamValue !== "false";

    // 5. 检查是否有模型ID
    if (!model) {
      console.error("错误: buildRequestBody 中未提供模型ID");
      throw new Error("模型ID是必需的，请在消息或响应上下文中提供");
    }

    console.log(
      `构建请求体，使用模型: ${model}, 温度: ${temperature}, 最大令牌数: ${maxTokens}, 流式: ${stream}`
    );

    // 6. 清理消息中的内部字段
    const cleanedMessages = messages.map((msg) => {
      // 避免修改原始消息对象
      const { _requestContext, ...cleanMsg } = msg;
      return cleanMsg;
    });

    return this.prepareRequestBody(
      cleanedMessages,
      model,
      temperature || 0.7,
      maxTokens || 2048,
      tools,
      stream !== undefined ? stream : true
    );
  }

  /**
   * 解析流式响应块
   * @param chunk 响应数据块
   * @returns 解析后的数据
   */
  parseStreamChunk(chunk: string | Uint8Array): any {
    // 如果是Uint8Array，转换为字符串
    const chunkStr =
      typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);

    if (!chunkStr || chunkStr.trim() === "") return null;

    // 处理可能包含多个JSON对象的情况
    // 1. 按行分割
    const lines = chunkStr.split(/\r?\n/).filter((line) => line.trim() !== "");

    // 2. 只处理最后一行有效数据
    if (lines.length === 0) return null;

    // 获取最后一行（最新的数据）
    const lastLine = lines[lines.length - 1];

    // 移除"data: "前缀
    const cleanedChunk = lastLine.replace(/^data:\s+/, "").trim();
    if (cleanedChunk === "[DONE]") return { done: true };

    try {
      return JSON.parse(cleanedChunk);
    } catch (error) {
      console.error(
        `解析流式响应块失败: ${error}, 原始数据: "${cleanedChunk}"`
      );

      // 尝试寻找有效的JSON部分
      const jsonMatch = cleanedChunk.match(/({.*})/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (nestedError) {
          console.error(`尝试解析JSON部分也失败: ${nestedError}`);
        }
      }

      return null;
    }
  }

  /**
   * 是否支持嵌入式工具调用
   */
  supportsEmbeddedToolCalls(): boolean {
    return false;
  }

  /**
   * 从响应中提取嵌入式工具调用
   */
  extractEmbeddedToolCalls(message: any): any[] {
    return [];
  }
}
