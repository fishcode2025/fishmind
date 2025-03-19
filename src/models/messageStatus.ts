/**
 * 消息状态枚举
 * 用于标识消息的当前状态
 */
export enum MessageStatus {
  /**
   * 待处理状态
   */
  Pending = "pending",

  /**
   * 生成中状态
   */
  Generating = "generating",

  /**
   * 已完成状态
   */
  Done = "done",

  /**
   * 错误状态
   */
  Error = "error",

  /**
   * 已取消状态
   */
  Cancelled = "cancelled",
}
