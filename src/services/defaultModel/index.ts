import { DefaultModelService } from './DefaultModelService';
export * from './DefaultModelStorage';
export * from './DefaultModelService';

// 创建一个单例实例
const defaultModelService = new DefaultModelService();

export default defaultModelService; 