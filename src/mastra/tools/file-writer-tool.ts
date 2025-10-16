import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

/**
 * File Writer Tool
 * 
 * agents/policy.mdにテキストを追記するツール
 * ディレクトリが存在しない場合は自動的に作成する
 * 
 * 受入基準:
 * - 要件3.1: agents/policy.mdファイルの末尾に改行を挿入した上で追記する
 * - 要件3.2: 追記時にタイムスタンプとコメント元のURL情報を含める
 */
export const fileWriterTool = createTool({
  id: "file-writer",
  description: "Writes or appends content to a file. Creates directory if it does not exist.",
  
  inputSchema: z.object({
    filePath: z.string().describe("Path to the file"),
    content: z.string().describe("Content to write"),
    mode: z.enum(["write", "append"]).default("append").describe("Write mode: 'write' overwrites, 'append' adds to end")
  }),
  
  outputSchema: z.object({
    success: z.boolean().describe("Whether the operation succeeded"),
    bytesWritten: z.number().describe("Number of bytes written")
  }),
  
  execute: async ({ context }) => {
    const { filePath, content, mode } = context;
    
    try {
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      if (mode === "append") {
        await fs.appendFile(filePath, content, "utf-8");
      } else {
        await fs.writeFile(filePath, content, "utf-8");
      }
      
      const bytesWritten = Buffer.byteLength(content, "utf-8");
      
      return {
        success: true,
        bytesWritten
      };
    } catch (error: any) {
      throw new Error(`Failed to write file at ${filePath}: ${error.message}`);
    }
  }
});
