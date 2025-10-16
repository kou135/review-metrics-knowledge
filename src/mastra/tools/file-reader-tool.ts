import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fs from "fs/promises";

/**
 * File Reader Tool
 * 
 * agents/policy.mdの内容を読み込むツール
 * ファイルが存在しない場合は空文字列を返す
 * 
 * 受入基準:
 * - 要件3.3: ファイルが存在しない場合の処理を実装
 */
export const fileReaderTool = createTool({
  id: "file-reader",
  description: "Reads content from a file. Returns empty string if file does not exist.",
  
  inputSchema: z.object({
    filePath: z.string().describe("Path to the file to read"),
    encoding: z.enum(["utf-8", "ascii"]).default("utf-8").describe("File encoding")
  }),
  
  outputSchema: z.object({
    content: z.string().describe("File content or empty string if file does not exist"),
    exists: z.boolean().describe("Whether the file exists")
  }),
  
  execute: async ({ context }) => {
    const { filePath, encoding } = context;
    
    try {
      const content = await fs.readFile(filePath, encoding);
      return {
        content,
        exists: true
      };
    } catch (error: any) {
      // ファイルが存在しない場合は空文字列を返す
      if (error.code === 'ENOENT') {
        return {
          content: "",
          exists: false
        };
      }
      
      // その他のエラーは再スロー
      throw new Error(`Failed to read file at ${filePath}: ${error.message}`);
    }
  }
});
