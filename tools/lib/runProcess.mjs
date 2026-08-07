import { execFile } from "node:child_process";

/**
 * Promisified process runner that never throws on a non-zero exit - callers
 * decide what a failure means (many QA/mechanical checks want to inspect
 * stderr rather than crash the whole pipeline).
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
export const runProcess = (command, args, options = {}) =>
  new Promise((resolve) => {
    execFile(command, args, { maxBuffer: 1024 * 1024 * 64, ...options }, (error, stdout, stderr) => {
      resolve({
        code: error && typeof error.code === "number" ? error.code : error ? 1 : 0,
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
      });
    });
  });
