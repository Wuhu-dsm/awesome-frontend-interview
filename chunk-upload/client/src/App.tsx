import React, { useState, useCallback, useRef } from 'react'
import {
  Upload,
  Pause,
  Play,
  X,
  CheckCircle,
  AlertCircle,
  File,
  Clock
} from 'lucide-react'

import FileChunkUploader from './uploader/index.ts'

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时间
const formatTime = (ms: number) => {
  if (!ms || ms === Infinity) return '--'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// 单个文件上传项组件
const FileUploadItem = ({ file, onRemove }: { file: File, onRemove: (file: File) => void }) => {
  const [uploader, setUploader] = useState<FileChunkUploader | null>(null)
  const [status, setStatus] = useState('waiting')
  const [progress, setProgress] = useState({
    loaded: 0,
    total: file.size,
    percentage: 0,
    speed: 0,
    remainingTime: 0
  })
  const [error, setError] = useState(null)

  React.useEffect(() => {
    const initUploader = async () => {
      // 检查localStorage中是否有该文件的上传记录
      const fileKey = `${file.name}_${file.size}_${file.lastModified}`
      const savedState = localStorage.getItem(`upload_${fileKey}`)
      
      const uploaderInstance = new FileChunkUploader(file, {
        chunkSize: 5 * 1024 * 1024, // 5MB
        maxConcurrent: 3,
        maxRetries: 3,
        enableSecondPass: true,
        checkChunkMD5: true
      })

      // 监听事件
      uploaderInstance.on('progress', (progressData) => {
        setProgress(progressData)
        // 保存上传进度到localStorage
        const uploadState = {
          fileKey,
          status: 'uploading',
          progress: progressData,
          timestamp: Date.now()
        }
        localStorage.setItem(`upload_${fileKey}`, JSON.stringify(uploadState))
      })
      
      uploaderInstance.on('success', (data) => {
        setStatus('success')
        setError(null)
        // 清除localStorage中的记录
        localStorage.removeItem(`upload_${fileKey}`)
      })
      
      uploaderInstance.on('error', err => {
        setStatus('error')
        setError(err.message || 'Upload failed')
        // 保存错误状态
        const uploadState = {
          fileKey,
          status: 'error',
          error: err.message,
          timestamp: Date.now()
        }
        localStorage.setItem(`upload_${fileKey}`, JSON.stringify(uploadState))
      })
      
      uploaderInstance.on('pause', () => {
        setStatus('paused')
        // 保存暂停状态
        const uploadState = {
          fileKey,
          status: 'paused',
          progress,
          timestamp: Date.now()
        }
        localStorage.setItem(`upload_${fileKey}`, JSON.stringify(uploadState))
      })
      
      uploaderInstance.on('resume', () => setStatus('uploading'))
      uploaderInstance.on('cancel', () => {
        setStatus('cancelled')
        // 清除localStorage中的记录
        localStorage.removeItem(`upload_${fileKey}`)
      })

      setUploader(uploaderInstance)

      // 如果有保存的状态，尝试恢复
      if (savedState) {
        try {
          const state = JSON.parse(savedState)
          const age = Date.now() - state.timestamp
          
          // 如果记录不超过24小时，尝试恢复
          if (age < 24 * 60 * 60 * 1000) {
            if (state.status === 'paused' || state.status === 'uploading') {
              setStatus('ready') // 设置为可继续状态
              if (state.progress) {
                setProgress(state.progress)
              }
              return
            }
          } else {
            // 清除过期记录
            localStorage.removeItem(`upload_${fileKey}`)
          }
        } catch (e) {
          console.error('Failed to parse saved upload state:', e)
        }
      }

      // 文件选择后立即进行秒传检查
      setStatus('checking')
      try {
        // 这里会触发上传器内部的文件检查逻辑
        // 如果文件已存在或有断点，会在success/progress事件中反映
        const canInstantUpload = await uploaderInstance.checkInstantUpload?.() || false
        if (canInstantUpload) {
          setStatus('success')
        } else {
          setStatus('ready') // 准备就绪，等待用户点击开始
        }
      } catch (error) {
        console.error('File check failed:', error)
        setStatus('ready')
      }
    }

    initUploader()

    return () => {
      // 在组件卸载时保存状态
      if (uploader) {
        const currentStatus = uploader.getStatus()
        if (currentStatus === 'uploading' || currentStatus === 'paused') {
          const fileKey = `${file.name}_${file.size}_${file.lastModified}`
          const uploadState = {
            fileKey,
            status: currentStatus,
            progress,
            timestamp: Date.now()
          }
          localStorage.setItem(`upload_${fileKey}`, JSON.stringify(uploadState))
        }
        
        if (currentStatus !== 'success' && currentStatus !== 'error' && currentStatus !== 'cancelled') {
          uploader.cancel()
        }
      }
    }
  }, [file])

  const handleStart = async () => {
    if (uploader && (status === 'ready' || status === 'waiting')) {
      try {
        setStatus('uploading')
        setError(null)
        await uploader.start()
      } catch (error) {
        setError(error.message)
        setStatus('error')
      }
    }
  }

  const handlePause = () => {
    if (uploader && status === 'uploading') {
      uploader.pause()
    }
  }

  const handleResume = () => {
    if (uploader && status === 'paused') {
      uploader.resume()
    }
  }

  const handleCancel = () => {
    if (uploader) {
      uploader.cancel()
      onRemove(file)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className='w-5 h-5 text-green-500' />
      case 'error':
        return <AlertCircle className='w-5 h-5 text-red-500' />
      case 'uploading':
      case 'paused':
        return <Clock className='w-5 h-5 text-blue-500' />
      default:
        return <File className='w-5 h-5 text-gray-400' />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'waiting':
        return '等待上传'
      case 'checking':
        return '检查文件中...'
      case 'ready':
        return '准备就绪'
      case 'uploading':
        return '上传中'
      case 'paused':
        return '已暂停'
      case 'success':
        return '上传成功'
      case 'error':
        return '上传失败'
      case 'cancelled':
        return '已取消'
      default:
        return '未知状态'
    }
  }

  return (
    <div className='border border-gray-200 rounded-lg p-4 bg-white shadow-sm'>
      {/* 文件信息 */}
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center space-x-3'>
          {getStatusIcon()}
          <div>
            <h3 className='text-sm font-medium text-gray-900 truncate max-w-xs'>
              {file.name}
            </h3>
            <p className='text-xs text-gray-500'>
              {formatFileSize(file.size)} • {getStatusText()}
            </p>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className='text-gray-400 hover:text-gray-600 transition-colors'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {/* 进度条 */}
      {(status === 'uploading' ||
        status === 'paused' ||
        status === 'success') && (
        <div className='mb-3'>
          <div className='flex justify-between text-xs text-gray-500 mb-1'>
            <span>{progress.percentage.toFixed(1)}%</span>
            <span>
              {formatFileSize(progress.loaded)} /{' '}
              {formatFileSize(progress.total)}
            </span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                status === 'success'
                  ? 'bg-green-500'
                  : status === 'paused'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 上传详情 */}
      {status === 'uploading' && (
        <div className='flex justify-between text-xs text-gray-500 mb-3'>
          <span>速度: {formatFileSize(progress.speed)}/s</span>
          <span>剩余时间: {formatTime(progress.remainingTime)}</span>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className='text-xs text-red-600 mb-3 p-2 bg-red-50 rounded'>
          {error}
        </div>
      )}

      {/* 操作按钮 */}
      <div className='flex space-x-2'>
        {(status === 'ready' || status === 'waiting') && (
          <button
            onClick={handleStart}
            className='flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors'
          >
            <Upload className='w-3 h-3' />
            <span>{status === 'ready' ? '继续上传' : '开始上传'}</span>
          </button>
        )}

        {status === 'checking' && (
          <div className='flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded'>
            <div className='w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin'></div>
            <span>检查中...</span>
          </div>
        )}

        {status === 'uploading' && (
          <button
            onClick={handlePause}
            className='flex items-center space-x-1 px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition-colors'
          >
            <Pause className='w-3 h-3' />
            <span>暂停</span>
          </button>
        )}

        {status === 'paused' && (
          <button
            onClick={handleResume}
            className='flex items-center space-x-1 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors'
          >
            <Play className='w-3 h-3' />
            <span>继续</span>
          </button>
        )}

        {(status === 'error' || status === 'cancelled') && (
          <button
            onClick={handleStart}
            className='flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors'
          >
            <Upload className='w-3 h-3' />
            <span>重新上传</span>
          </button>
        )}
      </div>
    </div>
  )
}
const TailwindStyles = () => (
  <link
    href='https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'
    rel='stylesheet'
  />
)
// 主上传组件
const FileUploadComponent = () => {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [incompleteUploads, setIncompleteUploads] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 页面加载时检查未完成的上传
  React.useEffect(() => {
    const checkIncompleteUploads = () => {
      const incomplete = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('upload_')) {
          try {
            const uploadState = JSON.parse(localStorage.getItem(key)!)
            const age = Date.now() - uploadState.timestamp
            
            // 只显示24小时内的记录
            if (age < 24 * 60 * 60 * 1000) {
              if (uploadState.status === 'paused' || uploadState.status === 'uploading') {
                incomplete.push(uploadState.fileKey)
              }
            } else {
              // 清除过期记录
              localStorage.removeItem(key)
            }
          } catch (e) {
            // 清除无效记录
            localStorage.removeItem(key)
          }
        }
      }
      setIncompleteUploads(incomplete)
    }

    checkIncompleteUploads()
  }, [])

  const handleFileSelect = useCallback(
    (selectedFiles: FileList) => {
      const fileArray = Array.from(selectedFiles)
      const newFiles = fileArray.filter(file => {
        // 检查文件是否已存在
        return !files.some(
          existingFile =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified
        )
      })

      setFiles(prev => [...prev, ...newFiles])
    },
    [files]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        handleFileSelect(droppedFiles)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        handleFileSelect(selectedFiles)
      }
      // 清空input值，允许重复选择同一文件
      e.target.value = ''
    },
    [handleFileSelect]
  )

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove))
  }, [])

  const handleClearAll = useCallback(() => {
    setFiles([])
  }, [])

  const getTotalProgress = () => {
    if (files.length === 0) return 0
    // 这里简化处理，实际应该获取每个文件的真实进度
    return 0
  }

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <TailwindStyles />
      
      {/* 未完成上传提示 */}
      {incompleteUploads.length > 0 && (
        <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
          <div className='flex items-center space-x-2'>
            <AlertCircle className='w-4 h-4 text-yellow-600' />
            <span className='text-sm text-yellow-800 font-medium'>
              发现 {incompleteUploads.length} 个未完成的上传任务
            </span>
          </div>
          <p className='text-xs text-yellow-700 mt-1'>
            重新选择相同文件可继续断点续传
          </p>
        </div>
      )}

      <div className='bg-white rounded-lg shadow-lg'>
        {/* 头部 */}
        <div className='px-6 py-4 border-b border-gray-200'>
          <h2 className='text-lg font-semibold text-gray-900'>文件上传</h2>
          <p className='text-sm text-gray-500 mt-1'>
            支持分片上传、断点续传、秒传等功能
          </p>
        </div>

        {/* 拖拽上传区域 */}
        <div className='p-6'>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              拖拽文件到这里上传
            </h3>
            <p className='text-gray-500 mb-4'>或者点击下方按钮选择文件</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className='inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
            >
              <Upload className='w-4 h-4 mr-2' />
              选择文件
            </button>
            <input
              ref={fileInputRef}
              type='file'
              multiple
              onChange={handleInputChange}
              className='hidden'
            />
          </div>
        </div>

        {/* 文件列表 */}
        {files.length > 0 && (
          <div className='px-6 pb-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-md font-medium text-gray-900'>
                上传列表 ({files.length} 个文件)
              </h3>
              <button
                onClick={handleClearAll}
                className='text-sm text-red-600 hover:text-red-700 transition-colors'
              >
                清空列表
              </button>
            </div>

            <div className='space-y-3'>
              {files.map((file, index) => (
                <FileUploadItem
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  file={file}
                  onRemove={handleRemoveFile}
                />
              ))}
            </div>
          </div>
        )}

        {/* 底部统计 */}
        {files.length > 0 && (
          <div className='px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg'>
            <div className='flex justify-between items-center text-sm text-gray-600'>
              <div>
                总文件数: {files.length} | 总大小:{' '}
                {formatFileSize(
                  files.reduce((total, file) => total + file.size, 0)
                )}
              </div>
              <div>整体进度: {getTotalProgress().toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className='mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4'>
        <h3 className='text-sm font-medium text-blue-900 mb-2'>功能特性</h3>
        <ul className='text-xs text-blue-700 space-y-1'>
          <li>• 支持大文件分片上传，默认分片大小 5MB</li>
          <li>• 支持断点续传，网络中断后可继续上传</li>
          <li>• 支持文件秒传，相同文件无需重复上传</li>
          <li>• 支持暂停/恢复上传</li>
          <li>• 支持并发上传控制，默认最大并发数 3</li>
          <li>• 支持上传失败自动重试，默认重试 3 次</li>
          <li>• 支持 MD5 校验确保文件完整性</li>
        </ul>
      </div>
    </div>
  )
}

export default FileUploadComponent
