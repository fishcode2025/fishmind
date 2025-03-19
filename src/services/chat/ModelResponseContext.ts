/**
 * 大模型回复上下文管理类
 * 用于存储和管理与特定消息ID关联的大模型回复内容
 */
export class ModelResponseContext {
  private messageId: string;
  private fullContent: string = "";
  private toolCallsData: any[] = [];
  private toolResultSummary: string = "";
  private metadata: Record<string, any> = {};
  private createdAt: Date;
  private lastUpdatedAt: Date;

  constructor(messageId: string) {
    this.messageId = messageId;
    this.createdAt = new Date();
    this.lastUpdatedAt = new Date();
  }

  // 基本访问方法
  getMessageId(): string {
    return this.messageId;
  }

  getFullContent(): string {
    return this.fullContent;
  }

  getToolCallsData(): any[] {
    return [...this.toolCallsData];
  }

  getToolResultSummary(): string {
    return this.toolResultSummary;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getLastUpdateTime(): Date {
    return this.lastUpdatedAt;
  }

  // 内容更新方法
  updateFullContent(content: string): void {
    this.fullContent = this.fullContent + content;
    this.lastUpdatedAt = new Date();
  }

  // 工具调用数据管理
  addToolCallData(toolCall: any): void {
    const existingIndex = this.toolCallsData.findIndex(
      (tc) => tc.id === toolCall.id
    );

    if (existingIndex >= 0) {
      this.toolCallsData[existingIndex] = {
        ...this.toolCallsData[existingIndex],
        ...toolCall,
        updatedAt: new Date(),
      };
    } else {
      this.toolCallsData.push({
        ...toolCall,
        addedAt: new Date(),
      });
    }

    this.lastUpdatedAt = new Date();
  }

  updateToolResultSummary(summary: string): void {
    this.toolResultSummary = summary;
    this.lastUpdatedAt = new Date();
  }

  // 元数据管理
  setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
    this.lastUpdatedAt = new Date();
  }

  getMetadata(key: string): any {
    return this.metadata[key];
  }

  getAllMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  // 序列化支持
  toJSON(): object {
    return {
      messageId: this.messageId,
      fullContent: this.fullContent,
      toolCallsData: this.toolCallsData,
      toolResultSummary: this.toolResultSummary,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      lastUpdatedAt: this.lastUpdatedAt.toISOString(),
    };
  }

  static fromJSON(data: any): ModelResponseContext {
    const context = new ModelResponseContext(data.messageId);
    context.fullContent = data.fullContent || "";
    context.toolCallsData = data.toolCallsData || [];
    context.toolResultSummary = data.toolResultSummary || "";
    context.metadata = data.metadata || {};
    context.createdAt = new Date(data.createdAt);
    context.lastUpdatedAt = new Date(data.lastUpdatedAt);
    return context;
  }
}
