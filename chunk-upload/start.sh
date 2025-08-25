#!/bin/bash

echo "🚀 启动分片上传系统..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到npm，请先安装npm"
    exit 1
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
npm install

# 安装前端依赖
echo "📦 安装前端依赖..."
cd client
npm install
cd ..

# 创建必要目录
echo "📁 创建上传目录..."
mkdir -p uploads
mkdir -p chunks

echo "✅ 依赖安装完成！"
echo ""
echo "🎯 启动说明："
echo "1. 启动后端服务器: npm start"
echo "2. 启动前端应用: cd client && npm start"
echo "3. 访问应用: http://localhost:3000"
echo ""
echo "💡 提示: 可以使用 npm run dev 启动后端开发模式"

# 询问是否立即启动服务
read -p "是否现在启动服务器？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔥 启动后端服务器..."
    npm start &
    
    echo "等待3秒后启动前端..."
    sleep 3
    
    echo "🔥 启动前端应用..."
    cd client
    npm start
fi