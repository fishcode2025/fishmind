/**
 * 从响应对象创建一个异步迭代器，用于读取流式数据
 * @param response Fetch API响应对象
 * @returns 异步迭代器，每次产生一个数据块
 */
export async function* readStreamChunks(
  response: Response
): AsyncGenerator<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法获取响应流的读取器");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 将数据块分割成行
 * @param chunk 数据块
 * @returns 分割后的行数组
 */
export function splitIntoLines(chunk: string): string[] {
  return chunk
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * 从行中提取数据块
 * @param line 包含数据的行
 * @returns 提取的数据块数组
 */
export function extractDataChunks(line: string): string[] {
  return line
    .split("data:")
    .filter((chunk) => chunk !== "")
    .map((chunk) => chunk.trim());
}
