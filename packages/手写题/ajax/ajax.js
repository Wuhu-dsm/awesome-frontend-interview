/**
 * 封装一个 ajax promise，包括拦截器，重试，超时等基础功能
 */

class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  use(fulfilled, rejected) {
    this.handlers.push({
      fulfilled,
      rejected,
    });
  }
}

class Axios {
  constructor() {
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager(),
    };
  }

  request(config) {
    // 拦截器链
    // undefined 是为了成对占位，对应拦截器的 fulfilled 和 rejected
    const chain = [this.dispatchRequest.bind(this), undefined];

    // 将请求拦截器添加到链的前面 (后进先出/先进后出，模拟 axios 行为)
    this.interceptors.request.handlers.forEach((interceptor) => {
      chain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    // 将响应拦截器添加到链的后面
    this.interceptors.response.handlers.forEach((interceptor) => {
      chain.push(interceptor.fulfilled, interceptor.rejected);
    });

    let promise = Promise.resolve(config);

    // 循环执行拦截器链
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }

  // 快捷方法
  get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  dispatchRequest(config) {
    return this.xhrAdapter(config).catch((error) => {
      // 重试逻辑
      const { retry, retryDelay, __retryCount = 0 } = config;

      if (!retry || __retryCount >= retry) {
        return Promise.reject(error);
      }

      config.__retryCount = __retryCount + 1;

      // 延迟重试
      const delay = new Promise((resolve) => {
        setTimeout(resolve, retryDelay || 1);
      });

      return delay.then(() => this.request(config));
    });
  }

  xhrAdapter(config) {
    return new Promise((resolve, reject) => {
      let {
        url,
        method = 'GET',
        data = null,
        headers = {},
        timeout = 0,
      } = config;

      const xhr = new XMLHttpRequest();
      xhr.open(method.toUpperCase(), url, true);

      // 设置超时
      xhr.timeout = timeout;

      // 如果 data 是对象，默认转换为 JSON 字符串并设置 Content-Type
      if (data && typeof data === 'object' && !(data instanceof FormData)) {
        data = JSON.stringify(data);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json;charset=utf-8';
        }
      }

      // 设置请求头
      Object.keys(headers).forEach((key) => {
        xhr.setRequestHeader(key, headers[key]);
      });

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            let responseData = xhr.responseText;
            try {
              // 尝试解析 JSON，如果失败则返回原字符串
              responseData = JSON.parse(xhr.responseText);
            } catch (e) {
              // parse error, keep original text
            }
            resolve({
              data: responseData,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: xhr.getAllResponseHeaders(),
              config: config,
            });
          } else {
            reject(new Error('Request failed with status ' + xhr.status));
          }
        }
      };

      xhr.onerror = function () {
        reject(new Error('Network Error'));
      };

      xhr.ontimeout = function () {
        reject(new Error('Timeout of ' + timeout + 'ms exceeded'));
      };

      xhr.send(data);
    });
  }
}

// 导出 Axios 类和便捷实例
const ajax = new Axios();

// --- 使用示例 ---
/*
// 1. 设置请求拦截器
ajax.interceptors.request.use(
  (config) => {
    console.log('请求拦截器：注入 token');
    config.headers['Authorization'] = 'Bearer token123';
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. 设置响应拦截器
ajax.interceptors.response.use(
  (response) => {
    console.log('响应拦截器：数据预处理');
    return response.data; // 只返回业务数据
  },
  (error) => {
    console.log('响应拦截器：统一错误处理');
    return Promise.reject(error);
  }
);

// 3. 发起请求 (带重试和超时)
ajax.request({
  url: 'https://api.example.com/data',
  method: 'GET',
  timeout: 5000,
  retry: 3,
  retryDelay: 1000
})
.then(data => console.log('成功:', data))
.catch(err => console.error('失败:', err));

// 4. 便捷方法
ajax.post('/api/user', { name: 'Alice' })
  .then(res => console.log(res));
*/

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Axios, ajax };
}
