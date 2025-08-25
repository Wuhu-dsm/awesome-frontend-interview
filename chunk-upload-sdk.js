/**
 * 分片上传SDK - 脱离React框架的纯JavaScript实现
 */

// 导入SparkMD5用于文件hash计算
// 注意：使用时需要引入 spark-md5 库

class ChunkUploadSDK {
  constructor(options = {}) {
    this.options = {
      baseURL: options.baseURL || 'http://localhost:3001/api',
      chunkSize: options.chunkSize || 2 * 1024 * 1024, // 2MB
      concurrency: options.concurrency || 3,
      timeout: options.timeout || 300000, // 5分钟超时
      retryTimes: options.retryTimes || 3,
      retryDelay: options.retryDelay || 1000,
      debug: options.debug || false,
      ...options
    };

    this.state = {
      file: null,
      hash: '',
      chunks: [],
      uploadedChunks: [],
      uploading: false,
      progress: 0,
      speed: 0,
      remainingTime: 0,
      error: null,
      success: false,
      canResume: false
    };

    this.abortController = null;
    this.startTime = null;
    this.uploadedBytes = 0;
    this.listeners = {};
    this.chunkRetryCount = new Map();
  }

  // 事件监听器
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  off(event, callback) {
    if (!this.listeners[event]) return this;
    if (!callback) {
      this.listeners[event] = [];
      return this;
    }
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    return this;
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }

  // 调试日志
  log(message, data = null) {
    if (this.options.debug) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[ChunkUploadSDK ${timestamp}] ${message}`, data || '');
    }
    this.emit('log', { message, data, timestamp: new Date() });
  }

  // 更新状态并触发事件
  updateState(newState) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.log('状态更新', { from: oldState, to: newState });
    this.emit('stateChange', { oldState, newState: this.state });
    return this.state;
  }

  // 计算文件hash
  async calculateHash(file) {
    return new Promise((resolve, reject) => {
      if (typeof SparkMD5 === 'undefined') {
        reject(new Error('SparkMD5 库未加载，请先引入 spark-md5'));
        return;
      }

      const chunks = Math.ceil(file.size / this.options.chunkSize);
      const spark = new SparkMD5.ArrayBuffer();
      const fileReader = new FileReader();
      let currentChunk = 0;

      fileReader.onload = (e) => {
        spark.append(e.target.result);
        currentChunk++;

        const progress = (currentChunk / chunks) * 100;
        this.emit('hashProgress', { progress });

        if (currentChunk < chunks) {
          loadNext();
        } else {
          resolve(spark.end());
        }
      };

      fileReader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      const loadNext = () => {
        const start = currentChunk * this.options.chunkSize;
        const end = Math.min(start + this.options.chunkSize, file.size);
        fileReader.readAsArrayBuffer(file.slice(start, end));
      };

      loadNext();
    });
  }

  // 创建文件分片
  createFileChunks(file) {
    const chunks = [];
    const totalChunks = Math.ceil(file.size / this.options.chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.options.chunkSize;
      const end = Math.min(start + this.options.chunkSize, file.size);
      chunks.push({
        chunk: file.slice(start, end),
        index: i,
        start,
        end,
        size: end - start
      });
    }
    
    return chunks;
  }

  // HTTP请求封装（带重试机制）
  async request(url, options = {}, retryCount = 0) {
    const fullUrl = `${this.options.baseURL}${url}`;
    
    // 为这个请求创建独立的AbortController
    const requestController = new AbortController();
    const config = {
      ...options,
      signal: requestController.signal
    };

    this.log(`HTTP请求`, { url: fullUrl, method: options.method || 'GET', retryCount });

    // 设置超时
    const timeoutId = setTimeout(() => {
      requestController.abort();
    }, this.options.timeout);

    try {
      // 如果主控制器已经中止，也中止这个请求
      if (this.abortController?.signal.aborted) {
        throw new Error('请求被取消');
      }

      const response = await fetch(fullUrl, config);
      clearTimeout(timeoutId);
      
      this.log(`HTTP响应`, { status: response.status, ok: response.ok, url: fullUrl });
      
      if (!response.ok) {
        let errorData;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            const text = await response.text();
            errorData = { error: text || `HTTP ${response.status}` };
          }
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      let result;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          result = { success: true, message: 'OK' };
        }
      } catch (e) {
        result = { success: true, message: 'OK' };
      }
      
      this.log(`HTTP成功`, { url: fullUrl, result });
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      this.log(`HTTP错误`, { url: fullUrl, error: error.message, retryCount });
      
      // 处理不同类型的错误
      if (error.name === 'AbortError') {
        if (this.abortController?.signal.aborted) {
          throw new Error('请求被取消');
        } else {
          throw new Error('请求超时');
        }
      }
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('网络连接失败，请检查网络或服务器状态');
      }
      
      // 重试逻辑
      if (retryCount < this.options.retryTimes && 
          !error.message.includes('请求被取消') && 
          !this.abortController?.signal.aborted) {
        
        const delay = this.options.retryDelay * Math.pow(2, retryCount); // 指数退避
        this.log(`准备重试`, { retryCount: retryCount + 1, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request(url, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  // 检查文件状态
  async checkFile(hash, filename) {
    this.log('检查文件状态', { hash, filename });
    try {
      const result = await this.request('/check-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hash, filename })
      });
      this.log('文件状态检查完成', result);
      return result;
    } catch (error) {
      this.log('文件状态检查失败', { error: error.message });
      throw error;
    }
  }

  // 上传分片（带重试和详细日志）
  async uploadChunk(chunkData) {
    const { chunk, hash, index, totalChunks, filename } = chunkData;
    
    this.log(`开始上传分片`, {
      chunkIndex: index,
      totalChunks,
      filename,
      hash,
      chunkSize: chunk.size,
      chunkType: chunk.type
    });

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('hash', hash);
    formData.append('chunkIndex', String(index));
    formData.append('totalChunks', String(totalChunks));
    formData.append('filename', filename);

    // 记录FormData内容用于调试
    if (this.options.debug) {
      for (let pair of formData.entries()) {
        if (pair[0] !== 'chunk') { // 不打印chunk二进制数据
          this.log(`FormData参数`, { key: pair[0], value: pair[1] });
        } else {
          this.log(`FormData参数`, { key: pair[0], size: pair[1].size, type: pair[1].type });
        }
      }
    }

    try {
      const result = await this.request('/upload-chunk', {
        method: 'POST',
        body: formData
      });
      
      this.log(`分片上传成功`, { chunkIndex: index, result });
      return result;
    } catch (error) {
      this.log(`分片上传失败`, { chunkIndex: index, error: error.message });
      throw error;
    }
  }

  // 合并分片
  async mergeChunks(hash, filename, totalChunks) {
    this.log('开始合并分片', { hash, filename, totalChunks });
    
    try {
      const result = await this.request('/merge-chunks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hash,
          filename,
          totalChunks
        })
      });
      
      this.log('分片合并成功', result);
      return result;
    } catch (error) {
      this.log('分片合并失败', { error: error.message });
      throw error;
    }
  }

  // 计算进度
  calculateProgress(uploadedChunks, totalChunks) {
    return totalChunks > 0 ? (uploadedChunks.length / totalChunks) * 100 : 0;
  }

  // 计算上传速度
  calculateSpeed(uploadedBytes, elapsedTime) {
    return elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
  }

  // 选择文件
  async selectFile(file) {
    try {
      this.log('开始处理文件', { 
        name: file.name, 
        size: file.size, 
        type: file.type,
        lastModified: file.lastModified
      });
      
      this.updateState({ file, uploading: true, error: null });
      this.emit('fileSelected', { file });
      
      this.log('开始计算文件哈希');
      const hash = await this.calculateHash(file);
      this.log('文件哈希计算完成', { hash });
      
      const chunks = this.createFileChunks(file);
      this.log('文件分片创建完成', { totalChunks: chunks.length, chunkSize: this.options.chunkSize });
      
      this.log('检查文件状态');
      const checkResult = await this.checkFile(hash, file.name);
      this.log('文件状态检查完成', checkResult);
      
      if (checkResult.uploaded) {
        this.log('文件已存在，直接完成');
        this.updateState({
          hash,
          chunks,
          uploading: false,
          success: true,
          progress: 100,
          error: null
        });
        this.emit('uploadComplete', { file, hash });
        return;
      }

      const uploadedChunks = checkResult.uploadedChunks || [];
      const canResume = uploadedChunks.length > 0;
      
      this.log('文件准备完成', { 
        uploadedChunks: uploadedChunks.length, 
        totalChunks: chunks.length, 
        canResume 
      });
      
      this.updateState({
        hash,
        chunks,
        uploadedChunks,
        uploading: false,
        canResume,
        progress: this.calculateProgress(uploadedChunks, chunks.length)
      });

      this.emit('fileReady', { file, hash, canResume, progress: this.state.progress });

    } catch (error) {
      this.log('文件选择错误', { error: error.message });
      this.updateState({
        uploading: false,
        error: error.message || '文件处理失败'
      });
      this.emit('error', { error: error.message || '文件处理失败' });
    }
  }

  // 开始上传
  async startUpload(concurrency) {
    const { file, hash, chunks, uploadedChunks } = this.state;
    const uploadConcurrency = concurrency || this.options.concurrency;
    
    this.log('开始上传文件', { 
      filename: file?.name, 
      totalChunks: chunks.length, 
      uploadedChunks: uploadedChunks.length,
      concurrency: uploadConcurrency,
      hash
    });
    
    if (!file || !hash || chunks.length === 0) {
      this.log('上传参数不完整', { file: !!file, hash: !!hash, chunks: chunks.length });
      return;
    }

    this.abortController = new AbortController();
    this.startTime = Date.now();
    this.uploadedBytes = uploadedChunks.length * this.options.chunkSize;
    this.chunkRetryCount.clear(); // 清空重试计数

    this.updateState({ 
      uploading: true, 
      error: null, 
      success: false 
    });

    this.emit('uploadStart', { file, hash });

    try {
      const pendingChunks = chunks.filter(
        (_, index) => !uploadedChunks.includes(index)
      );

      const currentUploadedChunks = [...uploadedChunks];
      
      let chunkIndex = 0;

      const uploadNextChunk = async () => {
        while (chunkIndex < pendingChunks.length && !this.abortController?.signal.aborted) {
          const chunk = pendingChunks[chunkIndex++];
          const chunkKey = `${hash}-${chunk.index}`;

          try {
            const chunkData = {
              chunk: chunk.chunk,
              hash,
              index: chunk.index,
              totalChunks: chunks.length,
              filename: file.name
            };

            this.log(`准备上传分片`, {
              index: chunk.index,
              size: chunk.size,
              start: chunk.start,
              end: chunk.end,
              totalChunks: chunks.length,
              filename: file.name,
              hash
            });

            await this.uploadChunk(chunkData);
            
            // 重置该分片的重试计数
            this.chunkRetryCount.delete(chunkKey);

            currentUploadedChunks.push(chunk.index);
            this.uploadedBytes += chunk.size;

            const elapsedTime = (Date.now() - this.startTime) / 1000;
            const speed = this.calculateSpeed(this.uploadedBytes, elapsedTime);
            const progress = this.calculateProgress(currentUploadedChunks, chunks.length);
            const remainingBytes = file.size - this.uploadedBytes;
            const remainingTime = speed > 0 ? remainingBytes / speed : 0;

            this.log(`分片上传完成`, {
              index: chunk.index,
              progress: Math.round(progress),
              speed: Math.round(speed),
              remainingTime: Math.round(remainingTime),
              uploadedChunks: currentUploadedChunks.length,
              totalChunks: chunks.length
            });

            this.updateState({
              uploadedChunks: [...currentUploadedChunks],
              progress,
              speed,
              remainingTime
            });

            this.emit('progress', {
              progress,
              speed,
              remainingTime,
              uploadedChunks: currentUploadedChunks.length,
              totalChunks: chunks.length,
              currentChunk: chunk.index
            });

          } catch (error) {
            const retryCount = this.chunkRetryCount.get(chunkKey) || 0;
            this.log(`分片上传失败`, {
              index: chunk.index,
              error: error.message,
              retryCount
            });

            // 如果还有重试机会，将分片重新加入队列
            if (retryCount < this.options.retryTimes) {
              this.chunkRetryCount.set(chunkKey, retryCount + 1);
              pendingChunks.push(chunk); // 重新加入队列
              this.log(`分片将重试`, { index: chunk.index, retryCount: retryCount + 1 });
            } else {
              this.log(`分片达到最大重试次数，放弃`, { index: chunk.index });
              throw error;
            }
          }
        }
      };

      this.log('开始并发上传', { 
        concurrency: uploadConcurrency, 
        pendingChunks: pendingChunks.length,
        alreadyUploaded: uploadedChunks.length 
      });

      const uploadPromises = [];
      for (let i = 0; i < Math.min(uploadConcurrency, pendingChunks.length); i++) {
        uploadPromises.push(uploadNextChunk());
      }

      await Promise.all(uploadPromises);

      if (!this.abortController?.signal.aborted) {
        this.log('所有分片上传完成，开始合并');
        const mergeResult = await this.mergeChunks(hash, file.name, chunks.length);
        this.log('文件上传完成', mergeResult);
        
        this.updateState({
          uploading: false,
          success: true,
          progress: 100,
          error: null
        });

        this.emit('uploadComplete', { file, hash, result: mergeResult });
      } else {
        this.log('上传被取消');
      }

    } catch (error) {
      this.log('上传错误', { error: error.message, stack: error.stack });
      
      if (!this.abortController?.signal.aborted) {
        this.updateState({
          uploading: false,
          error: error.message || '上传失败'
        });
        this.emit('error', { error: error.message || '上传失败' });
      }
    }
  }

  // 暂停上传
  pauseUpload() {
    this.log('暂停上传');
    if (this.abortController) {
      this.abortController.abort();
    }
    this.updateState({
      uploading: false,
      canResume: true
    });
    this.emit('uploadPaused');
  }

  // 恢复上传
  resumeUpload() {
    this.log('恢复上传');
    this.startUpload();
    this.emit('uploadResumed');
  }

  // 重置上传
  resetUpload() {
    this.log('重置上传');
    if (this.abortController) {
      this.abortController.abort();
    }
    this.updateState({
      file: null,
      hash: '',
      chunks: [],
      uploadedChunks: [],
      uploading: false,
      progress: 0,
      speed: 0,
      remainingTime: 0,
      error: null,
      success: false,
      canResume: false
    });
    this.uploadedBytes = 0;
    this.chunkRetryCount.clear();
    this.emit('uploadReset');
  }

  // 获取当前状态
  getState() {
    return { ...this.state };
  }

  // 工具函数 - 格式化文件大小
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 工具函数 - 格式化速度
  static formatSpeed(bytesPerSecond) {
    return ChunkUploadSDK.formatFileSize(bytesPerSecond) + '/s';
  }

  // 工具函数 - 格式化时间
  static formatTime(seconds) {
    if (seconds === Infinity || isNaN(seconds)) return '--';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}

// 支持不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChunkUploadSDK;
} else if (typeof define === 'function' && define.amd) {
  define([], function() {
    return ChunkUploadSDK;
  });
} else {
  window.ChunkUploadSDK = ChunkUploadSDK;
}