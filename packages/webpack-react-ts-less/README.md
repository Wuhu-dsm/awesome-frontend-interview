# Webpack + React + TypeScript + Less 学习项目

这是一个用于学习 Webpack 配置的完整项目模板，集成了 React 18、TypeScript 和 Less。

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产环境构建
npm run build
```

## 📁 项目结构

```
webpack-react-ts-less/
├── public/                    # 静态资源目录
│   └── index.html            # HTML 模板
├── src/                       # 源代码目录
│   ├── components/           # 组件目录
│   │   ├── Header/          # 头部组件
│   │   ├── Counter/         # 计数器组件
│   │   └── FeatureList/     # 特性列表组件
│   ├── styles/               # 样式目录
│   │   ├── variables.less   # Less 变量
│   │   ├── global.less      # 全局样式
│   │   └── App.module.less  # App 组件样式
│   ├── types/                # 类型声明目录
│   │   └── global.d.ts      # 全局类型声明
│   ├── utils/                # 工具函数目录
│   ├── App.tsx               # 主组件
│   └── index.tsx             # 入口文件
├── babel.config.js           # Babel 配置
├── tsconfig.json             # TypeScript 配置
├── webpack.config.js         # Webpack 配置
└── package.json              # 项目配置
```

## 📖 Webpack 配置详解

### 入口配置 (Entry)

```javascript
entry: './src/index.tsx',
```

指定 Webpack 打包的入口文件。

### 输出配置 (Output)

```javascript
output: {
  path: path.resolve(__dirname, 'dist'),
  filename: 'js/[name].[contenthash:8].js',
  clean: true,
  publicPath: '/',
}
```

- `path`: 输出目录的绝对路径
- `filename`: 输出文件名，使用 `[contenthash]` 实现缓存
- `clean`: 每次构建前清理输出目录
- `publicPath`: 资源引用的公共路径

### 模块解析 (Resolve)

```javascript
resolve: {
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
}
```

- `extensions`: 自动补全的文件扩展名
- `alias`: 路径别名，简化导入语句

### Loader 配置

#### Babel Loader

处理 TypeScript 和 JSX 语法：

```javascript
{
  test: /\.(ts|tsx|js|jsx)$/,
  exclude: /node_modules/,
  use: 'babel-loader',
}
```

#### Less Loader

处理 Less 样式文件，支持 CSS Modules：

```javascript
{
  test: /\.less$/,
  use: [
    'style-loader',      // 将 CSS 注入到 DOM
    'css-loader',        // 处理 CSS 导入
    'less-loader',       // 编译 Less 为 CSS
  ],
}
```

#### 资源模块

处理图片和字体资源：

```javascript
{
  test: /\.(png|jpg|jpeg|gif|svg)$/i,
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: 8 * 1024,  // 小于 8KB 转 base64
    },
  },
}
```

### 插件配置

#### HtmlWebpackPlugin

自动生成 HTML 文件并注入打包后的资源：

```javascript
new HtmlWebpackPlugin({
  template: './public/index.html',
  title: 'Webpack React TS Less',
})
```

#### MiniCssExtractPlugin

生产环境提取 CSS 到单独文件：

```javascript
new MiniCssExtractPlugin({
  filename: 'css/[name].[contenthash:8].css',
})
```

### 开发服务器配置

```javascript
devServer: {
  port: 3000,
  open: true,
  hot: true,
  historyApiFallback: true,
}
```

- `port`: 开发服务器端口
- `open`: 自动打开浏览器
- `hot`: 启用热模块替换
- `historyApiFallback`: 支持 HTML5 History 路由

### 代码分割

```javascript
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      react: {
        name: 'react',
        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
      },
      vendors: {
        name: 'vendors',
        test: /[\\/]node_modules[\\/]/,
      },
    },
  },
}
```

自动将第三方库分割成单独的 chunk，优化缓存。

## 🎨 CSS Modules 使用

文件命名为 `*.module.less` 即可启用 CSS Modules：

```tsx
import styles from './index.module.less';

const Component = () => (
  <div className={styles.container}>Hello</div>
);
```

## 📝 路径别名

项目配置了以下路径别名：

- `@` → `src/`
- `@components` → `src/components/`
- `@styles` → `src/styles/`
- `@utils` → `src/utils/`

## 🔧 扩展学习

1. **添加更多 Loader**: 根据需要添加 file-loader、url-loader 等
2. **优化配置**: 添加 terser-webpack-plugin、compression-webpack-plugin 等
3. **环境变量**: 使用 dotenv-webpack 管理环境变量
4. **代码检查**: 集成 ESLint 和 Prettier
5. **单元测试**: 添加 Jest 配置

## 📚 参考文档

- [Webpack 官方文档](https://webpack.js.org/)
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Less 官方文档](https://lesscss.org/)

