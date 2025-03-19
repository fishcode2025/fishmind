import { IMcpToolService } from "../interfaces";

/**
 * MCP工具接口
 */
export interface IMcpTool {
  /**
   * 工具名称
   */
  name: string;

  /**
   * 工具描述
   */
  description: string;

  /**
   * 工具输入模式
   */
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP工具调用处理器
 * 负责处理大模型返回的工具调用请求
 */
export class McpToolHandler {
  constructor(private mcpToolService: IMcpToolService) {}

  /**
   * 初始化工具处理器
   */
  async initialize(): Promise<void> {
    console.log("初始化MCP工具处理器");
  }

  /**
   * 获取可用工具列表
   * @param configId MCP客户端配置ID，如果不提供则获取所有可用工具
   * @returns 工具列表
   */
  async getTools(configId?: string): Promise<IMcpTool[]> {
    try {
      console.log(`获取MCP工具列表开始, configId=${configId || "所有"}`);

      if (configId) {
        // 获取特定配置的工具
        console.log(`获取特定配置的工具: ${configId}`);
        const tools = await this.mcpToolService.listTools(configId);
        console.log(`获取到 ${tools.length} 个工具, configId=${configId}`);

        const formattedTools = tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: tool.parameters_schema?.type || "object",
            properties: tool.parameters_schema?.properties || {},
            required: tool.parameters_schema?.required || [],
          },
        }));

        console.log(`格式化后的工具列表: ${JSON.stringify(formattedTools)}`);
        return formattedTools;
      } else {
        // 获取所有可用工具
        console.log("获取所有可用工具");
        const toolsMap = await this.mcpToolService.getAllAvailableTools();
        console.log(`获取到 ${Object.keys(toolsMap).length} 个配置的工具`);

        const allTools: IMcpTool[] = [];

        Object.entries(toolsMap).forEach(([configId, tools]) => {
          console.log(`配置 ${configId} 有 ${tools.length} 个工具`);

          tools.forEach((tool) => {
            allTools.push({
              name: `${configId}:${tool.name}`,
              description: tool.description,
              inputSchema: {
                type: tool.parameters_schema?.type || "object",
                properties: tool.parameters_schema?.properties || {},
                required: tool.parameters_schema?.required || [],
              },
            });
          });
        });

        console.log(`总共获取到 ${allTools.length} 个工具`);
        if (allTools.length > 0) {
          console.log(`工具示例: ${JSON.stringify(allTools[0])}`);
        }

        return allTools;
      }
    } catch (error) {
      console.error("获取工具列表失败:", error);
      return [];
    }
  }

  /**
   * 处理大模型返回的工具调用请求
   * @param toolCalls 工具调用请求数组
   * @returns 工具调用结果数组
   */
  async handleToolCalls(toolCalls: any[]): Promise<any[]> {
    console.log(`处理大模型工具调用请求开始, 共 ${toolCalls.length} 个调用`);
    console.log(`工具调用详情: ${JSON.stringify(toolCalls)}`);

    // 并行处理所有工具调用
    const results = await Promise.allSettled(
      toolCalls.map((call) => this.handleToolCall(call))
    );

    console.log(`工具调用处理完成, 结果数量: ${results.length}`);

    // 处理结果
    const processedResults = results.map((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`工具 ${toolCalls[index].name} 调用成功`);
        return {
          toolCallId: toolCalls[index].id,
          toolName: toolCalls[index].name,
          result: result.value,
        };
      } else {
        console.error(`工具 ${toolCalls[index].name} 调用失败:`, result.reason);
        return {
          toolCallId: toolCalls[index].id,
          toolName: toolCalls[index].name,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "工具调用失败",
        };
      }
    });

    console.log(`处理后的工具调用结果: ${JSON.stringify(processedResults)}`);
    return processedResults;
  }

  /**
   * 处理单个工具调用请求
   * @param toolCall 工具调用请求
   * @returns 工具调用结果
   * @private
   */
  public async handleToolCall(toolCall: any): Promise<any> {
    try {
      // 解析工具调用请求
      const { id: toolCallId, name, args } = toolCall;
      console.log(`处理单个工具调用: ${name}, 参数: ${JSON.stringify(args)}`);

      // 解析工具名称，格式可能是 "configId:toolName" 或直接是 "toolName"
      let configId = "";
      let toolName = name;

      if (name.includes(":")) {
        const parts = name.split(":");
        if (parts.length >= 2) {
          // 如果格式是 "mcp:configId:toolName"
          if (parts[0] === "mcp" && parts.length >= 3) {
            configId = parts[1];
            toolName = parts.slice(2).join(":");
          } else {
            // 如果格式是 "configId:toolName"
            configId = parts[0];
            toolName = parts.slice(1).join(":");
          }
        }
      }

      console.log(
        `解析后的工具调用: configId=${configId}, toolName=${toolName}`
      );

      // 确保参数是对象而不是字符串
      let parsedArgs = args;
      if (typeof args === "string") {
        try {
          console.log(`参数是字符串，尝试解析为JSON对象: ${args}`);
          parsedArgs = JSON.parse(args);
          console.log(`参数解析成功: ${JSON.stringify(parsedArgs)}`);
        } catch (e) {
          console.error(`参数解析失败: ${e}`);
          // 保持原始字符串
        }
      }

      // 检查参数是否包含工具调用信息
      if (parsedArgs && typeof parsedArgs === "object") {
        if (parsedArgs.name && parsedArgs.arguments) {
          console.log(`检测到参数中包含工具调用信息，提取 arguments 字段`);
          parsedArgs = parsedArgs.arguments;
        }
      }

      console.log(`最终参数: ${JSON.stringify(parsedArgs)}`);

      // 调用工具
      let result;
      if (configId) {
        console.log(`调用特定配置的工具: ${configId}:${toolName}`);
        result = await this.mcpToolService.callTool(
          configId,
          toolName,
          parsedArgs
        );
      } else {
        console.log(`调用默认配置的工具: ${toolName}`);
        // 尝试从工具名称中提取配置ID
        const availableTools = await this.mcpToolService.getAllAvailableTools();
        const configIds = Object.keys(availableTools);

        if (configIds.length > 0) {
          // 使用第一个可用的配置
          configId = configIds[0];
          console.log(`未指定配置ID，使用第一个可用配置: ${configId}`);
          result = await this.mcpToolService.callTool(
            configId,
            toolName,
            parsedArgs
          );
        } else {
          throw new Error("没有可用的MCP配置");
        }
      }

      console.log(`工具调用结果: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error(`工具 ${toolCall.name} 调用失败:`, error);
      throw error;
    }
  }

  /**
   * 获取所有可用的MCP工具，格式化为大模型可用的工具列表
   * @returns 格式化的工具列表
   */
  async getAvailableToolsForModel(): Promise<any[]> {
    try {
      // 获取所有可用工具
      const toolsMap = await this.mcpToolService.getAllAvailableTools();

      // 格式化工具列表
      const formattedTools: any[] = [];

      Object.entries(toolsMap).forEach(([configId, tools]) => {
        tools.forEach((tool) => {
          formattedTools.push({
            type: "function",
            function: {
              name: `mcp:${configId}:${tool.name}`,
              description: tool.description,
              parameters: tool.parameters_schema || {
                type: "object",
                properties: {},
              },
            },
          });
        });
      });

      return formattedTools;
    } catch (error) {
      console.error("获取可用工具列表失败:", error);
      return [];
    }
  }

  /**
   * 处理单个函数调用（兼容性别名，提供与handleToolCall相同的功能）
   * @param functionName 函数名称
   * @param functionArgs 函数参数
   * @param context 可选上下文
   * @returns 函数调用结果
   */
  public async handleFunctionCall(
    functionName: string,
    functionArgs: any,
    context?: any
  ): Promise<any> {
    // 构建适合handleToolCall的参数格式
    const toolCall = {
      name: functionName,
      args: functionArgs,
    };

    // 调用已有的handleToolCall方法
    return this.handleToolCall(toolCall);
  }
}
