# 大文件分片上传服务（示例）

## 启动

1. 安装依赖：`npm install`
2. 启动服务：`npm start`
3. 打开示例页面：`http://localhost:3000/`

## 接口说明

- `POST /upload/init`：初始化上传会话，返回 `uploadId` 与缺失分片列表
- `POST /upload/chunk`：上传单个分片（FormData：`uploadId`, `index`, `chunk`）
- `GET /upload/status`：查询缺失分片
- `POST /upload/complete`：校验并合并分片，返回文件访问地址