/**
 * 大文件分片上传器
 * 支持特性：
 * - 文件分片上传
 * - 断点续传
 * - 并发控制
 * - 失败重试
 * - 上传进度监控
 * - 暂停/恢复
 * - 文件秒传（MD5校验）
 * - 分片完整性校验
 */

import SparkMD5 from 'spark-md5'
import { buildApiUrl, API_ENDPOINTS } from '../config/api.ts'

// 上传状态枚举
enum UploadStatus {
  WAITING = 'waiting',
  CALCULATING = 'calculating',
  UPLOADING = 'uploading',
  PAUSED = 'paused',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

// 分片状态
enum ChunkStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// 分片信息
interface ChunkInfo {
  index: number
  start: number
  end: number
  size: number
  hash?: string
  status: ChunkStatus
  retryCount: number
  progress: number
}

// 上传配置
interface UploadConfig {
  chunkSize?: number // 分片大小，默认 5MB
  maxConcurrent?: number // 最大并发数，默认 3
  maxRetries?: number // 最大重试次数，默认 3
  retryDelay?: number // 重试延迟，默认 1000ms
  headers?: Record<string, string> // 自定义请求头
  withCredentials?: boolean // 是否携带凭证
  timeout?: number // 超时时间，默认 30000ms
  checkChunkMD5?: boolean // 是否校验分片MD5
  enableSecondPass?: boolean // 是否启用秒传
}

// 上传进度信息
interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number // 上传速度 bytes/s
  remainingTime: number // 剩余时间 ms
}

// 文件元信息
interface FileMeta {
  name: string
  size: number
  type: string
  lastModified: number
  hash?: string
  chunkCount: number
}

// 事件类型
type UploadEventType =
  | 'progress'
  | 'chunk-complete'
  | 'success'
  | 'error'
  | 'pause'
  | 'resume'
  | 'cancel'

// 事件监听器
type EventListener<T = any> = (data: T) => void

class FileChunkUploader {
  private file: File
  private config: Required<UploadConfig>
  private chunks: ChunkInfo[] = []
  private uploadedChunks: Set<number> = new Set()
  private status: UploadStatus = UploadStatus.WAITING
  private uploadQueue: ChunkInfo[] = []
  private activeUploads: Map<number, XMLHttpRequest> = new Map()
  private eventListeners: Map<UploadEventType, Set<EventListener>> = new Map()
  private startTime: number = 0
  private uploadedBytes: number = 0
  private lastProgressTime: number = 0
  private lastProgressLoaded: number = 0
  private fileMeta: FileMeta | null = null
  private fileHash: string = ''
  private uploadId: string = ''
  private abortController: AbortController | null = null

  constructor (file: File, config: UploadConfig = {}) {
    this.file = file
    this.config = {
      chunkSize: config.chunkSize || 5 * 1024 * 1024, // 5MB
      maxConcurrent: config.maxConcurrent || 3,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      headers: config.headers || {},
      withCredentials: config.withCredentials || false,
      timeout: config.timeout || 30000,
      checkChunkMD5: config.checkChunkMD5 || false,
      enableSecondPass: config.enableSecondPass || true
    }

    this.initializeChunks()
  }

  // 初始化分片
  private initializeChunks (): void {
    const chunkCount = Math.ceil(this.file.size / this.config.chunkSize)

    for (let i = 0; i < chunkCount; i++) {
      const start = i * this.config.chunkSize
      const end = Math.min(start + this.config.chunkSize, this.file.size)

      this.chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        status: ChunkStatus.PENDING,
        retryCount: 0,
        progress: 0
      })
    }

    this.fileMeta = {
      name: this.file.name,
      size: this.file.size,
      type: this.file.type,
      lastModified: this.file.lastModified,
      chunkCount: chunkCount
    }
  }

  // 计算文件MD5
  private async calculateFileMD5 (): Promise<string> {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer()
      const chunkSize = 2 * 1024 * 1024 // 2MB for MD5 calculation
      const chunks = Math.ceil(this.file.size / chunkSize)
      let currentChunk = 0

      const loadNext = () => {
        const start = currentChunk * chunkSize
        const end = Math.min(start + chunkSize, this.file.size)
        const reader = new FileReader()

        reader.onload = e => {
          spark.append(e.target?.result as ArrayBuffer)
          currentChunk++

          if (currentChunk < chunks) {
            loadNext()
          } else {
            const hash = spark.end()
            resolve(hash)
          }
        }

        reader.onerror = reject
        reader.readAsArrayBuffer(this.file.slice(start, end))
      }

      loadNext()
    })
  }

  // 计算分片MD5
  private async calculateChunkMD5 (chunk: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        const spark = new SparkMD5.ArrayBuffer()
        spark.append(e.target?.result as ArrayBuffer)
        resolve(spark.end())
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(chunk)
    })
  }

  // 检查文件是否已存在（秒传）
  private async checkFileExists (): Promise<boolean> {
    if (!this.config.enableSecondPass) return false

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.UPLOAD_CHECK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify({
          hash: this.fileHash,
          name: this.file.name,
          size: this.file.size
        })
      })

      const data = await response.json()
      return data.exists
    } catch (error) {
      console.error('Check file exists error:', error)
      return false
    }
  }

  // 获取已上传的分片
  private async getUploadedChunks (): Promise<number[]> {
    try {
      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.UPLOAD_CHUNKS, { uploadId: this.uploadId }),
        {
          headers: this.config.headers
        }
      )

      if (response.ok) {
        const data = await response.json()
        return data.uploadedChunks || []
      }
    } catch (error) {
      console.error('Get uploaded chunks error:', error)
    }
    return []
  }

  // 创建上传任务
  private async createUploadTask (): Promise<string> {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.UPLOAD_CREATE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      body: JSON.stringify({
        ...this.fileMeta,
        hash: this.fileHash,
        chunkSize: this.config.chunkSize
      })
    })

    const data = await response.json()
    return data.uploadId
  }

  // 上传单个分片
  private async uploadChunk (chunkInfo: ChunkInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const { index, start, end } = chunkInfo
      const chunk = this.file.slice(start, end)
      const formData = new FormData()

      formData.append('chunk', chunk)
      formData.append('index', index.toString())
      formData.append('uploadId', this.uploadId)
      formData.append('total', this.chunks.length.toString())

      const xhr = new XMLHttpRequest()
      this.activeUploads.set(index, xhr)

      // 上传进度
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          chunkInfo.progress = (e.loaded / e.total) * 100
          this.emitProgress()
        }
      }

      // 上传完成
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          chunkInfo.status = ChunkStatus.SUCCESS
          chunkInfo.progress = 100
          this.uploadedChunks.add(index)
          this.activeUploads.delete(index)
          this.emit('chunk-complete', { index, total: this.chunks.length })
          resolve()
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`)
        }
      }

      // 上传错误
      xhr.onerror = () => {
        this.activeUploads.delete(index)
        reject(new Error('Network error'))
      }

      // 超时
      xhr.ontimeout = () => {
        this.activeUploads.delete(index)
        reject(new Error('Upload timeout'))
      }

      xhr.timeout = this.config.timeout
      xhr.withCredentials = this.config.withCredentials

      // 添加MD5校验
      if (this.config.checkChunkMD5) {
        this.calculateChunkMD5(chunk).then(hash => {
          formData.append('hash', hash)
          xhr.open('POST', buildApiUrl(API_ENDPOINTS.UPLOAD_CHUNK))

          // 设置自定义头
          Object.entries(this.config.headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value)
          })

          xhr.send(formData)
        })
      } else {
        xhr.open('POST', buildApiUrl(API_ENDPOINTS.UPLOAD_CHUNK))

        // 设置自定义头
        Object.entries(this.config.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value)
        })

        xhr.send(formData)
      }

      chunkInfo.status = ChunkStatus.UPLOADING
    })
  }

  // 处理分片上传（包含重试机制）
  private async processChunk (chunkInfo: ChunkInfo): Promise<void> {
    try {
      await this.uploadChunk(chunkInfo)
    } catch (error) {
      chunkInfo.status = ChunkStatus.ERROR
      chunkInfo.retryCount++

      if (chunkInfo.retryCount < this.config.maxRetries) {
        // 延迟重试
        await this.delay(this.config.retryDelay * chunkInfo.retryCount)
        return this.processChunk(chunkInfo)
      } else {
        throw new Error(
          `Chunk ${chunkInfo.index} upload failed after ${this.config.maxRetries} retries`
        )
      }
    }
  }

  // 处理上传队列
  private async processQueue (): Promise<void> {
    while (
      this.uploadQueue.length > 0 &&
      this.status === UploadStatus.UPLOADING
    ) {
      const availableSlots = this.config.maxConcurrent - this.activeUploads.size

      if (availableSlots <= 0) {
        await this.delay(100)
        continue
      }

      const chunks = this.uploadQueue.splice(0, availableSlots)

      await Promise.all(
        chunks.map(chunk =>
          this.processChunk(chunk).catch(error => {
            this.emit('error', { chunk: chunk.index, error })
            throw error
          })
        )
      )
    }
  }

  // 合并分片
  private async mergeChunks (): Promise<any> {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.UPLOAD_MERGE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      body: JSON.stringify({
        uploadId: this.uploadId,
        hash: this.fileHash,
        ...this.fileMeta
      })
    })

    if (!response.ok) {
      throw new Error('Merge chunks failed')
    }

    return response.json()
  }

  // 计算上传进度
  private calculateProgress (): UploadProgress {
    const loaded = this.chunks.reduce((acc, chunk) => {
      if (chunk.status === ChunkStatus.SUCCESS) {
        return acc + chunk.size
      } else if (chunk.status === ChunkStatus.UPLOADING) {
        return acc + (chunk.size * chunk.progress) / 100
      }
      return acc
    }, 0)

    const total = this.file.size
    const percentage = (loaded / total) * 100

    // 计算速度
    const now = Date.now()
    const timeDiff = now - this.lastProgressTime
    const loadedDiff = loaded - this.lastProgressLoaded
    const speed = timeDiff > 0 ? (loadedDiff / timeDiff) * 1000 : 0

    // 计算剩余时间
    const remaining = total - loaded
    const remainingTime = speed > 0 ? (remaining / speed) * 1000 : 0

    this.lastProgressTime = now
    this.lastProgressLoaded = loaded

    return {
      loaded,
      total,
      percentage,
      speed,
      remainingTime
    }
  }

  // 发送进度事件
  private emitProgress (): void {
    const progress = this.calculateProgress()
    this.emit('progress', progress)
  }

  // 延迟函数
  private delay (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 事件发送
  private emit (event: UploadEventType, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => listener(data))
    }
  }

  // 添加事件监听
  public on (event: UploadEventType, listener: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  // 移除事件监听
  public off (event: UploadEventType, listener: EventListener): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  // 开始上传
  public async start (): Promise<void> {
    if (this.status === UploadStatus.UPLOADING) {
      return
    }

    try {
      this.status = UploadStatus.CALCULATING
      this.startTime = Date.now()
      this.lastProgressTime = this.startTime
      this.abortController = new AbortController()

      // 计算文件hash
      if (this.config.enableSecondPass || this.config.checkChunkMD5) {
        // 计算
        console.time('md5耗时')
        this.fileHash = await this.calculateFileMD5()
        console.timeEnd('md5耗时')
        this.fileMeta!.hash = this.fileHash
      }

      // 检查秒传
      if (this.config.enableSecondPass) {
        const exists = await this.checkFileExists()
        if (exists) {
          this.status = UploadStatus.SUCCESS
          this.emit('success', {
            message: 'File already exists, upload skipped',
            duration: Date.now() - this.startTime
          })
          return
        }
      }

      // 创建上传任务
      this.uploadId = await this.createUploadTask()

      // 获取已上传的分片（断点续传）
      const uploadedChunks = await this.getUploadedChunks()
      uploadedChunks.forEach(index => {
        this.uploadedChunks.add(index)
        this.chunks[index].status = ChunkStatus.SUCCESS
        this.chunks[index].progress = 100
      })

      // 准备上传队列
      this.uploadQueue = this.chunks.filter(
        chunk => !this.uploadedChunks.has(chunk.index)
      )

      if (this.uploadQueue.length === 0) {
        // 所有分片已上传，直接合并
        await this.mergeChunks()
        this.status = UploadStatus.SUCCESS
        this.emit('success', {
          duration: Date.now() - this.startTime
        })
        return
      }

      this.status = UploadStatus.UPLOADING

      // 开始处理队列
      await this.processQueue()

      // 合并分片
      const result = await this.mergeChunks()

      this.status = UploadStatus.SUCCESS
      this.emit('success', {
        ...result,
        duration: Date.now() - this.startTime
      })
    } catch (error) {
      this.status = UploadStatus.ERROR
      this.emit('error', error)
      throw error
    }
  }

  // 暂停上传
  public pause (): void {
    if (this.status !== UploadStatus.UPLOADING) {
      return
    }

    this.status = UploadStatus.PAUSED

    // 取消所有活动的上传
    this.activeUploads.forEach((xhr, index) => {
      xhr.abort()
      const chunk = this.chunks[index]
      if (chunk.status === ChunkStatus.UPLOADING) {
        chunk.status = ChunkStatus.PENDING
        this.uploadQueue.unshift(chunk)
      }
    })

    this.activeUploads.clear()
    this.emit('pause', null)
  }

  // 恢复上传
  public async resume (): Promise<void> {
    if (this.status !== UploadStatus.PAUSED) {
      return
    }

    this.status = UploadStatus.UPLOADING
    this.emit('resume', null)

    await this.processQueue()

    if (this.uploadQueue.length === 0 && this.activeUploads.size === 0) {
      const result = await this.mergeChunks()
      this.status = UploadStatus.SUCCESS
      this.emit('success', {
        ...result,
        duration: Date.now() - this.startTime
      })
    }
  }

  // 取消上传
  public cancel (): void {
    this.status = UploadStatus.CANCELLED

    // 取消所有活动的上传
    this.activeUploads.forEach(xhr => xhr.abort())
    this.activeUploads.clear()

    // 清空队列
    this.uploadQueue = []

    // 取消控制器
    if (this.abortController) {
      this.abortController.abort()
    }

    this.emit('cancel', null)
  }

  // 获取上传状态
  public getStatus (): UploadStatus {
    return this.status
  }

  // 获取分片信息
  public getChunks (): ChunkInfo[] {
    return [...this.chunks]
  }

  // 获取上传进度
  public getProgress (): UploadProgress {
    return this.calculateProgress()
  }
}

// 使用示例
export default FileChunkUploader

/* 使用方法：
const file = document.getElementById('file-input').files[0];
const uploader = new FileChunkUploader(file, {
  chunkSize: 5 * 1024 * 1024, // 5MB
  maxConcurrent: 3,
  maxRetries: 3,
  enableSecondPass: true,
  checkChunkMD5: true
});

// 监听事件
uploader.on('progress', (progress) => {
  console.log(`上传进度: ${progress.percentage.toFixed(2)}%`);
  console.log(`上传速度: ${(progress.speed / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`剩余时间: ${Math.ceil(progress.remainingTime / 1000)} 秒`);
});

uploader.on('chunk-complete', ({ index, total }) => {
  console.log(`分片 ${index + 1}/${total} 上传完成`);
});

uploader.on('success', (data) => {
  console.log('上传成功', data);
});

uploader.on('error', (error) => {
  console.error('上传失败', error);
});

// 开始上传
await uploader.start();

// 暂停
uploader.pause();

// 恢复
uploader.resume();

// 取消
uploader.cancel();
*/
