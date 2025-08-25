/**
 * API 配置文件
 * 统一管理所有API端点地址
 */

// API 基础配置
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001',
  TIMEOUT: 30000,
  RETRY_TIMES: 3,
  RETRY_DELAY: 1000
}

// API 端点定义
export const API_ENDPOINTS = {
  // 上传相关接口
  UPLOAD_CHECK: '/api/upload/check',          // 检查文件是否存在（秒传）
  UPLOAD_CREATE: '/api/upload/create',        // 创建上传任务
  UPLOAD_CHUNK: '/api/upload/chunk',          // 上传分片
  UPLOAD_MERGE: '/api/upload/merge',          // 合并分片
  UPLOAD_CHUNKS: '/api/upload/:uploadId/chunks', // 获取已上传分片列表
  
  // 文件管理接口
  FILE_DELETE: '/api/file/delete',            // 删除文件
  FILE_LIST: '/api/file/list',                // 文件列表
  FILE_INFO: '/api/file/:fileId/info'         // 文件详情
}

/**
 * 构建完整的API URL
 * @param endpoint - API 端点
 * @param params - URL 参数（可选）
 * @returns 完整的 API URL
 */
export function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`
  
  // 替换 URL 参数
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value)
    })
  }
  
  return url
}

/**
 * 创建带有默认配置的 fetch 请求选项
 * @param options - 额外的请求选项
 * @returns 请求选项对象
 */
export function createRequestOptions(options: RequestInit = {}): RequestInit {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }
}

// 导出默认配置
export default {
  API_CONFIG,
  API_ENDPOINTS,
  buildApiUrl,
  createRequestOptions
}