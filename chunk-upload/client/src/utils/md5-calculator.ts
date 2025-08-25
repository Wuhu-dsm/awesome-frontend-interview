/**
 * MD5 计算器工具类
 * 封装 Web Worker MD5 计算功能
 */

import type { WorkerMessage, WorkerResponse } from '../workers/md5.worker'

export interface MD5Progress {
  percentage: number
  currentChunk: number
  totalChunks: number
}

export interface MD5CalculatorOptions {
  chunkSize?: number
  onProgress?: (progress: MD5Progress) => void
}

export class MD5Calculator {
  private worker: Worker | null = null

  /**
   * 计算文件 MD5
   */
  async calculateFile(file: File, options: MD5CalculatorOptions = {}): Promise<string> {
    const { chunkSize = 2 * 1024 * 1024, onProgress } = options

    return new Promise((resolve, reject) => {
      // 创建 Worker
      this.worker = new Worker(new URL('../workers/md5.worker.ts', import.meta.url), {
        type: 'module'
      })

      // 监听 Worker 消息
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type } = event.data

        switch (type) {
          case 'progress':
            if (onProgress) {
              const { percentage, currentChunk, totalChunks } = event.data
              onProgress({ percentage, currentChunk, totalChunks })
            }
            break
          case 'result':
            const { hash } = event.data
            this.cleanup()
            resolve(hash)
            break
          case 'error':
            const { error } = event.data
            this.cleanup()
            reject(new Error(error))
            break
        }
      }

      this.worker.onerror = (error) => {
        this.cleanup()
        reject(error)
      }

      // 发送计算任务
      const message: WorkerMessage = {
        type: 'calculate',
        file,
        chunkSize
      }
      this.worker.postMessage(message)
    })
  }

  /**
   * 取消计算
   */
  cancel(): void {
    this.cleanup()
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

/**
 * 便捷函数：计算文件 MD5
 */
export async function calculateFileMD5(
  file: File, 
  options: MD5CalculatorOptions = {}
): Promise<string> {
  const calculator = new MD5Calculator()
  try {
    return await calculator.calculateFile(file, options)
  } finally {
    calculator.cancel()
  }
}