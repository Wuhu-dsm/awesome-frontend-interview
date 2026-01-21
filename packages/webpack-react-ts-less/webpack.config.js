const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  // 判断是否为生产环境
  const isProduction = argv.mode === 'production';

  return {
    // ==================== 入口配置 ====================
    // 指定 webpack 打包的入口文件
    entry: './src/index.tsx',

    // ==================== 输出配置 ====================
    output: {
      // 输出目录的绝对路径
      path: path.resolve(__dirname, 'dist'),
      // 输出文件名，[contenthash] 用于生成基于内容的 hash，有利于缓存
      filename: isProduction ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
      // 每次构建前清理输出目录
      clean: true,
      // 公共路径，影响资源引用路径
      publicPath: '/',
    },

    // ==================== 模块解析配置 ====================
    resolve: {
      // 配置模块解析时自动补全的扩展名
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      // 路径别名配置
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@styles': path.resolve(__dirname, 'src/styles'),
        '@utils': path.resolve(__dirname, 'src/utils'),
      },
    },

    // ==================== 模块规则配置 ====================
    module: {
      rules: [
        // ----- TypeScript/JavaScript 处理规则 -----
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              // 启用缓存，加速二次构建
              cacheDirectory: true,
            },
          },
        },

        // ----- Less 样式处理规则 -----
        {
          test: /\.less$/,
          use: [
            // 开发环境使用 style-loader 实现热更新
            // 生产环境使用 MiniCssExtractPlugin 提取 CSS 文件
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                // 启用 CSS Modules
                modules: {
                  // 只对 .module.less 文件启用 CSS Modules
                  auto: (resourcePath) => resourcePath.endsWith('.module.less'),
                  // 生成的类名格式
                  localIdentName: isProduction
                    ? '[hash:base64:8]'
                    : '[path][name]__[local]',
                },
                // 在 css-loader 之前应用的 loader 数量
                importLoaders: 1,
              },
            },
            {
              loader: 'less-loader',
              options: {
                lessOptions: {
                  // 启用 Less 的 JavaScript 功能
                  javascriptEnabled: true,
                },
              },
            },
          ],
        },

        // ----- 普通 CSS 处理规则 -----
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
          ],
        },

        // ----- 图片资源处理规则 -----
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/i,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              // 小于 8KB 的图片转为 base64
              maxSize: 8 * 1024,
            },
          },
          generator: {
            // 输出文件名
            filename: 'images/[name].[contenthash:8][ext]',
          },
        },

        // ----- 字体资源处理规则 -----
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[contenthash:8][ext]',
          },
        },
      ],
    },

    // ==================== 插件配置 ====================
    plugins: [
      // HTML 模板插件
      new HtmlWebpackPlugin({
        template: './public/index.html',
        title: 'Webpack React TS Less',
        // 生产环境压缩 HTML
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeAttributeQuotes: true,
            }
          : false,
      }),

      // 生产环境提取 CSS 文件
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: 'css/[name].[contenthash:8].css',
              chunkFilename: 'css/[id].[contenthash:8].css',
            }),
          ]
        : []),
    ],

    // ==================== 开发服务器配置 ====================
    devServer: {
      // 端口号
      port: 3000,
      // 自动打开浏览器
      open: true,
      // 启用热模块替换
      hot: true,
      // 启用 gzip 压缩
      compress: true,
      // 历史路由模式支持
      historyApiFallback: true,
      // 静态资源目录
      static: {
        directory: path.join(__dirname, 'public'),
      },
      // 客户端覆盖层显示错误
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },

    // ==================== 代码分割配置 ====================
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // 提取 React 相关库
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            priority: 20,
          },
          // 提取其他第三方库
          vendors: {
            name: 'vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
          },
        },
      },
      // 提取 runtime 代码
      runtimeChunk: 'single',
    },

    // ==================== Source Map 配置 ====================
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',

    // ==================== 性能提示配置 ====================
    performance: {
      hints: isProduction ? 'warning' : false,
      // 入口文件最大体积
      maxEntrypointSize: 512000,
      // 单个资源最大体积
      maxAssetSize: 512000,
    },
  };
};

