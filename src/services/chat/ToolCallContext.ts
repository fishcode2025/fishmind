/**
 * 工具调用上下文管理
 * 负责跟踪和管理工具调用的状态和历史记录
 */

/**
 * 工具调用状态枚举
 */
export enum ToolCallState {
  PENDING = "pending", // 等待执行
  COLLECTING_ARGS = "collecting_args", // 收集参数中
  EXECUTING = "executing", // 执行中
  COMPLETED = "completed", // 执行完成
  FAILED = "failed", // 执行失败
  ERROR = "error", // 错误
  TIMEOUT = "timeout", // 执行超时
}

/**
 * 工具调用记录接口
 */
export interface ToolCallRecord {
  id: string; // 工具调用ID
  name: string; // 工具名称
  args: any; // 工具参数
  state: ToolCallState; // 工具调用状态
  result?: any; // 工具调用结果
  error?: string; // 错误信息
  startTime: number; // 开始时间
  endTime?: number; // 结束时间
  parentId?: string; // 父工具调用ID（用于链式调用）
}

/**
 * 工具调用上下文类
 * 管理工具调用的状态和历史记录
 */
export class ToolCallContext {
  private toolCallHistory: Map<string, ToolCallRecord> = new Map();
  private activeToolCallIds: Set<string> = new Set();
  private messageId: string;
  private aborted: boolean = false;

  constructor(messageId: string) {
    this.messageId = messageId;
  }

  /**
   * 创建新的工具调用记录
   */
  createToolCall(
    id: string,
    name: string,
    args?: any,
    parentId?: string
  ): ToolCallRecord {
    const record: ToolCallRecord = {
      id,
      name,
      args: args || "",
      state: ToolCallState.PENDING,
      startTime: Date.now(),
      parentId,
    };

    this.toolCallHistory.set(id, record);
    this.activeToolCallIds.add(id);
    return record;
  }

  /**
   * 更新工具调用状态
   */
  updateToolCallState(
    id: string,
    state: ToolCallState,
    data?: { result?: any; error?: string }
  ): ToolCallRecord | null {
    const record = this.toolCallHistory.get(id);
    if (!record) return null;

    record.state = state;

    if (
      state === ToolCallState.COMPLETED ||
      state === ToolCallState.FAILED ||
      state === ToolCallState.TIMEOUT
    ) {
      record.endTime = Date.now();
      this.activeToolCallIds.delete(id);

      if (data?.result !== undefined) {
        record.result = data.result;
      }

      if (data?.error !== undefined) {
        record.error = data.error;
      }
    }

    return record;
  }

  /**
   * 获取工具调用记录
   */
  getToolCall(id: string): ToolCallRecord | null {
    return this.toolCallHistory.get(id) || null;
  }

  /**
   * 获取所有工具调用记录
   */
  getAllToolCalls(): ToolCallRecord[] {
    return Array.from(this.toolCallHistory.values());
  }

  /**
   * 获取活跃的工具调用ID列表
   */
  getActiveToolCallIds(): string[] {
    return Array.from(this.activeToolCallIds);
  }

  /**
   * 获取工具调用链（所有相关的工具调用）
   */
  getToolCallChain(rootId: string): ToolCallRecord[] {
    const result: ToolCallRecord[] = [];
    const record = this.toolCallHistory.get(rootId);

    if (record) {
      result.push(record);

      // 查找所有以此ID为父ID的记录
      for (const [_, childRecord] of this.toolCallHistory) {
        if (childRecord.parentId === rootId) {
          result.push(...this.getToolCallChain(childRecord.id));
        }
      }
    }

    return result;
  }

  /**
   * 获取消息ID
   */
  getMessageId(): string {
    return this.messageId;
  }

  /**
   * 清空工具调用历史
   */
  clear(): void {
    this.toolCallHistory.clear();
    this.activeToolCallIds.clear();
  }

  /**
   * 获取根工具调用（没有父调用的工具调用）
   */
  getRootToolCalls(): ToolCallRecord[] {
    return Array.from(this.toolCallHistory.values()).filter(
      (record) => !record.parentId
    );
  }

  /**
   * 检查工具调用链是否已完成
   */
  isToolChainCompleted(rootId: string): boolean {
    const chain = this.getToolCallChain(rootId);
    return chain.every(
      (record) =>
        record.state === ToolCallState.COMPLETED ||
        record.state === ToolCallState.FAILED ||
        record.state === ToolCallState.ERROR ||
        record.state === ToolCallState.TIMEOUT
    );
  }

  /**
   * 中止所有活动的工具调用
   */
  abort(): void {
    this.aborted = true;
    // 将所有活动的工具调用标记为失败
    for (const id of this.activeToolCallIds) {
      this.updateToolCallState(id, ToolCallState.FAILED, {
        error: "用户中止操作",
      });
    }
    this.activeToolCallIds.clear();
  }

  /**
   * 检查是否已中止
   */
  isAborted(): boolean {
    return this.aborted;
  }

  /**
   * 重置中止状态
   */
  resetAborted(): void {
    this.aborted = false;
  }
}
