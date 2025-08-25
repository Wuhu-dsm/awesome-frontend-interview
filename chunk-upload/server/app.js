const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const crypto = require('crypto')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 配置
const UPLOAD_DIR = './uploads'
const TEMP_DIR = './temp'
const CHUNK_DIR = './chunks'

// 确保目录存在
async function ensureDir (dir) {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

// 初始化目录
;(async () => {
  await ensureDir(UPLOAD_DIR)
  await ensureDir(TEMP_DIR)
  await ensureDir(CHUNK_DIR)
})()

// 存储上传任务信息
const uploadTasks = new Map()

// 计算文件MD5
function calculateMD5 (filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = require('fs').createReadStream(filePath)

    stream.on('data', data => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

// 计算buffer MD5
function calculateBufferMD5 (buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

// 配置multer存储
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB per chunk
  }
})

// 检查文件是否已存在（秒传）
app.post('/api/upload/check', async (req, res) => {
  try {
    const { hash, name, size } = req.body

    if (!hash) {
      return res.status(400).json({ error: 'Hash is required' })
    }

    // 检查文件是否已存在
    const filePath = path.join(UPLOAD_DIR, `${hash}_${name}`)

    try {
      const stats = await fs.stat(filePath)
      if (stats.size === size) {
        return res.json({
          exists: true,
          filePath: filePath,
          size: stats.size
        })
      }
    } catch (error) {
      // 文件不存在
    }

    res.json({ exists: false })
  } catch (error) {
    console.error('Check file error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 创建上传任务
app.post('/api/upload/create', async (req, res) => {
  try {
    const { name, size, type, hash, chunkCount, chunkSize } = req.body

    // 检查是否已存在相同hash的未完成任务
    let existingTask = null
    for (const [id, task] of uploadTasks.entries()) {
      if (task.hash === hash && task.size === size && task.name === name) {
        existingTask = { uploadId: id, ...task }
        break
      }
    }

    if (existingTask) {
      // 返回现有任务
      console.log(`Resuming existing upload task: ${existingTask.uploadId}`)
      return res.json({
        uploadId: existingTask.uploadId,
        message: 'Resuming existing upload task',
        isResume: true
      })
    }

    // 创建新任务
    const uploadId = crypto.randomUUID()
    const taskInfo = {
      uploadId,
      name,
      size,
      type,
      hash,
      chunkCount,
      chunkSize,
      uploadedChunks: new Set(),
      createdAt: new Date(),
      chunkDir: path.join(CHUNK_DIR, uploadId)
    }

    // 创建分片存储目录
    await ensureDir(taskInfo.chunkDir)

    uploadTasks.set(uploadId, taskInfo)

    console.log(`Created new upload task: ${uploadId}`)
    res.json({
      uploadId,
      message: 'Upload task created successfully',
      isResume: false
    })
  } catch (error) {
    console.error('Create upload task error:', error)
    res.status(500).json({ error: 'Failed to create upload task' })
  }
})

// 获取已上传的分片
app.get('/api/upload/:uploadId/chunks', async (req, res) => {
  try {
    const { uploadId } = req.params
    const task = uploadTasks.get(uploadId)

    if (!task) {
      return res.status(404).json({ error: 'Upload task not found' })
    }

    // 检查分片目录中已存在的分片
    try {
      const files = await fs.readdir(task.chunkDir)
      const uploadedChunks = files
        .filter(file => file.startsWith('chunk_'))
        .map(file => parseInt(file.split('_')[1]))
        .sort((a, b) => a - b)

      // 更新任务信息
      task.uploadedChunks = new Set(uploadedChunks)

      res.json({ uploadedChunks })
    } catch (error) {
      res.json({ uploadedChunks: [] })
    }
  } catch (error) {
    console.error('Get uploaded chunks error:', error)
    res.status(500).json({ error: 'Failed to get uploaded chunks' })
  }
})

// 上传分片
app.post('/api/upload/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { index, uploadId, total, hash } = req.body
    const chunkBuffer = req.file.buffer

    if (!uploadId || index === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const task = uploadTasks.get(uploadId)
    if (!task) {
      return res.status(404).json({ error: 'Upload task not found' })
    }

    // 验证分片MD5（如果提供）
    if (hash) {
      const calculatedHash = calculateBufferMD5(chunkBuffer)
      if (calculatedHash !== hash) {
        return res.status(400).json({
          error: 'Chunk hash mismatch',
          expected: hash,
          actual: calculatedHash
        })
      }
    }

    // 保存分片
    const chunkPath = path.join(task.chunkDir, `chunk_${index}`)
    await fs.writeFile(chunkPath, chunkBuffer)

    // 更新已上传分片记录
    task.uploadedChunks.add(parseInt(index))

    console.log(
      `Chunk ${parseInt(index) + 1}/${total} uploaded for task ${uploadId}`
    )

    res.json({
      success: true,
      index: parseInt(index),
      message: `Chunk ${parseInt(index) + 1}/${total} uploaded successfully`
    })
  } catch (error) {
    console.error('Upload chunk error:', error)
    res.status(500).json({ error: 'Failed to upload chunk' })
  }
})

// 合并分片
app.post('/api/upload/merge', async (req, res) => {
  try {
    const { uploadId, hash, name, size } = req.body

    const task = uploadTasks.get(uploadId)
    if (!task) {
      return res.status(404).json({ error: 'Upload task not found' })
    }

    // 检查所有分片是否都已上传
    if (task.uploadedChunks.size !== task.chunkCount) {
      return res.status(400).json({
        error: 'Not all chunks uploaded',
        uploaded: task.uploadedChunks.size,
        total: task.chunkCount
      })
    }

    // 合并文件
    const finalPath = path.join(UPLOAD_DIR, `${hash || Date.now()}_${name}`)
    const writeStream = require('fs').createWriteStream(finalPath)

    try {
      // 按顺序合并分片
      for (let i = 0; i < task.chunkCount; i++) {
        const chunkPath = path.join(task.chunkDir, `chunk_${i}`)
        const chunkBuffer = await fs.readFile(chunkPath)
        writeStream.write(chunkBuffer)
      }

      writeStream.end()

      // 等待写入完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })

      // 验证合并后的文件
      const stats = await fs.stat(finalPath)
      if (stats.size !== size) {
        throw new Error(
          `File size mismatch. Expected: ${size}, Actual: ${stats.size}`
        )
      }

      // 验证文件MD5（如果提供）
      if (hash) {
        const calculatedHash = await calculateMD5(finalPath)
        if (calculatedHash !== hash) {
          await fs.unlink(finalPath) // 删除错误文件
          throw new Error(
            `File hash mismatch. Expected: ${hash}, Actual: ${calculatedHash}`
          )
        }
      }

      // 清理分片文件
      try {
        await fs.rmdir(task.chunkDir, { recursive: true })
      } catch (error) {
        console.warn('Failed to cleanup chunks:', error)
      }

      // 移除上传任务
      uploadTasks.delete(uploadId)

      console.log(`File merged successfully: ${finalPath}`)

      res.json({
        success: true,
        filePath: finalPath,
        fileName: name,
        fileSize: stats.size,
        hash: hash,
        message: 'File uploaded and merged successfully'
      })
    } catch (mergeError) {
      // 清理失败的文件
      try {
        await fs.unlink(finalPath)
      } catch {}
      throw mergeError
    }
  } catch (error) {
    console.error('Merge chunks error:', error)
    res.status(500).json({ error: error.message || 'Failed to merge chunks' })
  }
})

// 删除上传任务
app.delete('/api/upload/:uploadId', async (req, res) => {
  try {
    const { uploadId } = req.params
    const task = uploadTasks.get(uploadId)

    if (!task) {
      return res.status(404).json({ error: 'Upload task not found' })
    }

    // 清理分片文件
    try {
      await fs.rmdir(task.chunkDir, { recursive: true })
    } catch (error) {
      console.warn('Failed to cleanup chunks:', error)
    }

    // 移除上传任务
    uploadTasks.delete(uploadId)

    res.json({ success: true, message: 'Upload task deleted' })
  } catch (error) {
    console.error('Delete upload task error:', error)
    res.status(500).json({ error: 'Failed to delete upload task' })
  }
})

// 获取上传任务状态
app.get('/api/upload/:uploadId/status', (req, res) => {
  const { uploadId } = req.params
  const task = uploadTasks.get(uploadId)

  if (!task) {
    return res.status(404).json({ error: 'Upload task not found' })
  }

  res.json({
    uploadId: task.uploadId,
    name: task.name,
    size: task.size,
    chunkCount: task.chunkCount,
    uploadedChunks: Array.from(task.uploadedChunks),
    progress: (task.uploadedChunks.size / task.chunkCount) * 100,
    createdAt: task.createdAt
  })
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeTasks: uploadTasks.size
  })
})

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('Server error:', error)

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Chunk size too large' })
    }
  }

  res.status(500).json({ error: 'Internal server error' })
})

// 定时清理过期任务（24小时）
setInterval(() => {
  const now = new Date()
  const expiredTasks = []

  for (const [uploadId, task] of uploadTasks.entries()) {
    const age = now - task.createdAt
    if (age > 24 * 60 * 60 * 1000) {
      // 24小时
      expiredTasks.push(uploadId)
    }
  }

  expiredTasks.forEach(async uploadId => {
    const task = uploadTasks.get(uploadId)
    if (task) {
      try {
        await fs.rmdir(task.chunkDir, { recursive: true })
      } catch (error) {
        console.warn('Failed to cleanup expired task chunks:', error)
      }
      uploadTasks.delete(uploadId)
      console.log(`Cleaned up expired task: ${uploadId}`)
    }
  })
}, 60 * 60 * 1000) // 每小时检查一次

app.listen(PORT, () => {
  console.log(`Upload server running on port ${PORT}`)
  console.log(`Upload directory: ${path.resolve(UPLOAD_DIR)}`)
  console.log(`Temp directory: ${path.resolve(TEMP_DIR)}`)
  console.log(`Chunk directory: ${path.resolve(CHUNK_DIR)}`)
})
