import { BaseDirectory, mkdir, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';


/**
 * 确保目录存在
 */
export async function ensureDir(dir: string): Promise<void> {
  try {
    console.log(`确保目录存在: ${dir}`);
    
    // 检查目录是否存在
    const dirExists = await exists(dir, { baseDir: BaseDirectory.AppData });
    console.log(`目录是否存在: ${dirExists}`);
    
    if (!dirExists) {
      console.log(`创建目录: ${dir}`);
      await mkdir(dir, { 
        baseDir: BaseDirectory.AppData,
        recursive: true 
      });
      console.log(`目录创建成功: ${dir}`);
    }
  } catch (error) {
    console.error(`确保目录存在失败: ${dir}`, error);
    throw error;
  }
}

/**
 * 读取文件内容
 */
export async function readFile(path: string): Promise<string> {
  try {
    console.log(`读取文件: ${path}`);
    const content = await readTextFile(path, { baseDir: BaseDirectory.AppData });
    console.log(`文件读取成功: ${path}`);
    return content;
  } catch (error) {
    console.error(`读取文件失败: ${path}`, error);
    throw error;
  }
}

/**
 * 写入文件内容
 */
export async function writeFile(path: string, content: string): Promise<void> {
  try {
    console.log(`写入文件: ${path}`);
    
    // 确保父目录存在
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex > 0) {
      const dir = path.substring(0, lastSlashIndex);
      await ensureDir(dir);
    }
    
    // 写入文件内容
    await writeTextFile(path, content, { baseDir: BaseDirectory.AppData });
    console.log(`文件写入成功: ${path}`);
  } catch (error) {
    console.error(`写入文件失败: ${path}`, error);
    throw error;
  }
}

/**
 * 检查文件是否存在
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    console.log(`检查文件是否存在: ${path}`);
    const fileExists = await exists(path, { baseDir: BaseDirectory.AppData });
    console.log(`文件是否存在: ${fileExists}`);
    return fileExists;
  } catch (error) {
    console.error(`检查文件是否存在失败: ${path}`, error);
    throw error;
  }
} 