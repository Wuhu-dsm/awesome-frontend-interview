1xx 信息性状态码 (Informational)
表示服务器已收到请求，需要请求者继续执行操作。

101 Switching Protocols (切换协议)： 服务器根据客户端的请求切换协议（例如从 HTTP 切换到 WebSocket）。

2xx 成功状态码 (Success)
表示请求已成功被服务器接收、理解并接受。

200 OK： 最常见的成功状态码。表示请求成功，数据正常返回。

201 Created： 请求成功且服务器创建了新的资源（通常用于 POST 请求）。

204 No Content： 服务器成功处理了请求，但没有返回任何内容（常用于删除操作）。

3xx 重定向状态码 (Redirection)
表示资源位置发生了变动，需要客户端进一步操作以完成请求。

301 Moved Permanently： 永久移动。请求的资源已被永久分配了新的 URL。

302 Found： 临时移动。资源临时位于其他位置。

304 Not Modified： 未修改。表示资源自上次请求以来未改变，客户端可以使用缓存版本，从而节省带宽。

4xx 客户端错误状态码 (Client Error)
表示请求包含错误语法或无法完成请求，通常是前端的问题。

400 Bad Request： 语义有误或参数错误，服务器不理解该请求。

401 Unauthorized： 未授权。需要身份验证（如登录）。

403 Forbidden： 拒绝访问。服务器理解请求但拒绝执行（通常是权限不足）。

404 Not Found： 最著名的状态码。 服务器找不到请求的资源。

405 Method Not Allowed： 请求方法（如 GET、POST）不被允许。

5xx 服务器错误状态码 (Server Error)
表示服务器在处理请求的过程中发生了错误，通常是后端或配置问题。

500 Internal Server Error： 服务器内部错误。这是一个“兜底”的错误，通常是后端代码崩溃。

502 Bad Gateway： 网关错误。作为网关或代理的服务器从上游服务器收到了无效响应。

503 Service Unavailable： 服务不可用。服务器暂时超载或正在维护。

504 Gateway Timeout： 网关超时。服务器作为代理未能及时从上游收到响应。