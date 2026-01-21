第一阶段：输入与解析 (Input & Parsing)
当你在地址栏输入内容时，浏览器主要做两件事：判断和组装。

判断输入类型： 浏览器分析你输入的是合法的 URL（如 example.com）还是普通的搜索关键词（如 "如何做红烧肉"）。

如果是关键词，浏览器会使用默认搜索引擎（如 Google 或 Baidu）合成搜索 URL。

如果是 URL，浏览器会检查是否包含协议头（HTTP/HTTPS）。如果没有，通常默认加上 https://。

HSTS 检查： 浏览器检查该域名是否在 HSTS（HTTP Strict Transport Security）预加载列表中。如果在，浏览器会强制使用 HTTPS 协议，防止中间人降级攻击。

📝 示例场景： 你输入了 www.example.com 并回车。浏览器识别这是一个域名，并自动补全为 https://www.example.com。

第二阶段：DNS 域名解析 (Finding the IP)
浏览器不知道 www.example.com 在哪里，它需要知道服务器的 IP 地址（如 93.184.216.34）。这个过程称为 DNS 解析。

详细查找顺序（由近及远）：

浏览器缓存： 检查浏览器自身是否在几分钟内访问过该域名。

系统缓存 (Hosts)： 检查操作系统缓存或 /etc/hosts 文件。

路由器缓存： 询问路由器。

ISP DNS 服务器： 询问互联网服务提供商（ISP）的本地 DNS 服务器。

递归搜索： 如果本地 DNS 不知道，它会代替你进行全球递归查询：

问 根域名服务器 (.) -> 告诉它去问 .com 顶级域名服务器。

问 TLD 服务器 (.com) -> 告诉它去问 example.com 的权威名称服务器。

问 权威名称服务器 (example.com) -> 得到最终 IP 地址。

📝 示例场景： 经过一圈查询，浏览器最终拿到 www.example.com 的 IP 地址是 93.184.216.34。

第三阶段：建立连接 (Connection Establishment)
拿到 IP 后，浏览器需要与服务器建立通信通道。这里涉及两个关键握手：TCP 握手（建立可靠传输）和 TLS 握手（建立加密传输）。

1. TCP 三次握手 (The 3-Way Handshake)
为了防止已失效的连接请求报文段突然又传送到了服务端，产生错误，需要进行三次确认：

SYN： 浏览器发送 "你好，我想建立连接" (SYN=1, Seq=X)。

SYN + ACK： 服务器回复 "好的，我准备好了，你确认一下" (SYN=1, ACK=X+1, Seq=Y)。

ACK： 浏览器回复 "好的，我知道你准备好了，连接建立" (ACK=Y+1, Seq=X+1)。

2. TLS/SSL 握手 (HTTPS 专用)
如果使用 HTTPS，在 TCP 建立后，还需要进行 TLS 握手来协商加密密钥：

浏览器发送支持的加密算法列表。

服务器选择一种算法，并把自己的 数字证书 发给浏览器。

浏览器验证证书有效性（是否过期、是否由受信任机构颁发）。

双方利用非对称加密技术，协商出一个对称加密的 会话密钥 (Session Key)。

📝 示例场景： 浏览器和 93.184.216.34 成功建立了加密连接，后续所有数据传输都将使用协商好的密钥进行加密。

第四阶段：发送请求与服务器处理 (Request & Response)
连接建立后，真正的数据交换才开始。

发送 HTTP 请求： 浏览器构建一个 HTTP 报文发送给服务器。

HTTP
GET /index.html HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0 ...
Accept: text/html,application/xhtml+xml...
Cookie: session_id=xyz...
服务器处理：

负载均衡器（如 Nginx）接收请求，转发给应用服务器（如 Node.js, Java, Python）。

服务器解析请求，可能需要查询数据库。

服务器生成响应内容（通常是 HTML 字符串）。

服务器返回响应：

HTTP
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Encoding: gzip

<!DOCTYPE html>
<html>...</html>
📝 示例场景： 服务器告诉浏览器："状态码 200（成功），我发给你的是 HTML 文件，已经压缩过了，内容如下..."

第五阶段：浏览器渲染 (Browser Rendering)
这是用户感知最明显的阶段，浏览器将代码转换为屏幕上的像素。这个过程称为 关键渲染路径 (Critical Rendering Path)。

构建 DOM 树 (Parse HTML)： 浏览器从上到下解析 HTML 文档，将标签（Tags）转换为节点（Nodes），构建 DOM (文档对象模型) 树。

注意： 如果遇到 <script> 标签，默认会阻塞解析，直到脚本下载并执行完成（除非使用了 async 或 defer）。

构建 CSSOM 树 (Parse CSS)： 同时，浏览器解析 CSS 文件和 <style> 标签，构建 CSSOM (CSS 对象模型) 树。它决定了每个节点应该长什么样（颜色、大小）。

生成渲染树 (Render Tree)： 将 DOM 树和 CSSOM 树合并。

剔除不可见元素： 如 <head> 或 display: none 的元素不会出现在渲染树中（注意：visibility: hidden 的元素会在树中，因为它占据空间）。

布局 (Layout / Reflow)： 浏览器计算渲染树中每个节点在屏幕上的确切位置和大小。这被称为"回流"（Reflow）。

绘制 (Paint)： 浏览器将每个节点的视觉规则（颜色、背景、边框、阴影）填充到像素中。

合成 (Composite)： 浏览器将不同的图层（Layer）上传给 GPU，GPU 将它们合成一张最终的图片显示在屏幕上。

📝 示例场景：

浏览器读到 <h1>Example Domain</h1>，在 DOM 树创建 h1 节点。

读到 CSS h1 { color: red; }，在 CSSOM 记录规则。

合并后知道 "h1 是红色"。

布局： 计算出 h1 位于页面顶部，宽 100%，高 50px。

绘制： 在对应坐标画出红色文字。

用户看到了页面。

总结与断开连接
页面加载完成后，如果设置了 Connection: keep-alive，TCP 连接会保持一段时间以便后续请求（如图片、CSS 资源）复用；否则，会触发 TCP 四次挥手断开连接。

这一整个复杂的流程，通常是在 几百毫秒 到 几秒钟 内完成的。