/**
 * MD5 计算 Web Worker
 * 在独立线程中处理大文件的 MD5 计算，避免阻塞主线程
 */

import SparkMD5 from 'spark-md5'

interface MD5CalculateMessage {
  type: 'calculate'
  file: File
  chunkSize?: number
}

interface MD5ProgressMessage {
  type: 'progress'
  percentage: number
  currentChunk: number
  totalChunks: number
}

interface MD5ResultMessage {
  type: 'result'
  hash: string
}

interface MD5ErrorMessage {
  type: 'error'
  error: string
}

type WorkerMessage = MD5CalculateMessage
type WorkerResponse = MD5ProgressMessage | MD5ResultMessage | MD5ErrorMessage

// Worker 消息处理
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, file, chunkSize = 2 * 1024 * 1024 } = event.data

  if (type === 'calculate') {
    try {
      const hash = await calculateFileMD5(file, chunkSize, (progress) => {
        self.postMessage({
          type: 'progress',
          percentage: progress.percentage,
          currentChunk: progress.currentChunk,
          totalChunks: progress.totalChunks
        } as MD5ProgressMessage)
      })

      self.postMessage({
        type: 'result',
        hash
      } as MD5ResultMessage)
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as MD5ErrorMessage)
    }
  }
}

async function calculateFileMD5(
  file: File,
  chunkSize: number,
  onProgress?: (progress: { percentage: number; currentChunk: number; totalChunks: number }) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer()
    const totalChunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0

    const loadNext = () => {
      const start = currentChunk * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const reader = new FileReader()

      reader.onload = e => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          spark.append(arrayBuffer)
          currentChunk++

          // 报告进度
          if (onProgress) {
            onProgress({
              percentage: (currentChunk / totalChunks) * 100,
              currentChunk,
              totalChunks
            })
          }

          if (currentChunk < totalChunks) {
            // 使用 setTimeout 让出控制权，避免长时间阻塞
            setTimeout(loadNext, 0)
          } else {
            const hash = spark.end()
            resolve(hash)
          }
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('File reading error'))
      }

      reader.readAsArrayBuffer(file.slice(start, end))
    }

    loadNext()
  })
}

export type { WorkerMessage, WorkerResponse }