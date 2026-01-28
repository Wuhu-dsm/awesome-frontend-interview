/**
 * 封装 Fetch 请求工具
 * @param {string} url 请求地址
 * @param {Object} options 配置项 (method, data, headers, timeout...)
 */
async function request(url, {
    method = 'GET',
    data = null,
    headers = {},
    timeout = 8000,
    ...customConfig
} = {}) {

    // 1. 处理超时逻辑
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // 2. 默认请求头
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // 3. 处理 GET 请求的参数
    if (method.toUpperCase() === 'GET' && data) {
        const params = new URLSearchParams(data).toString();
        url += (url.includes('?') ? '&' : '?') + params;
    }

    const config = {
        method: method.toUpperCase(),
        headers: { ...defaultHeaders, ...headers },
        signal: controller.signal,
        ...customConfig,
    };

    // 4. 处理 POST/PUT 请求体
    if (data && method.toUpperCase() !== 'GET') {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        clearTimeout(timer); // 成功拿到响应，清除定时器

        // 5. 检查 HTTP 状态码 (fetch 只有网络错误才会 reject，404/500 会进入 resolve)
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        switch(response.){
            case ''
        }
        // 6. 解析数据
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('请求超时了！');
        }
        throw error;
    }
}