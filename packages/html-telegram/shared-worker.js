// 存储所有连接的端口
const ports = [];

self.onconnect = (e) => {
    const port = e.ports[0];
    ports.push(port);

    port.onmessage = (event) => {
        // 收到消息后，广播给所有其他连接的端口
        const { data } = event;
        ports.forEach(p => {
            // 可选：排除发送者自己
            // if (p !== port) 
            p.postMessage(data);
        });
    };

    // 如果使用 addEventListener 必须显式调用 start()
    // port.start(); 
};