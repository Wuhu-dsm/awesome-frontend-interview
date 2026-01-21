module.exports = {
  // ==================== 预设配置 ====================
  presets: [
    // ----- @babel/preset-env -----
    // 根据目标环境自动确定需要的 Babel 插件和 polyfill
    [
      '@babel/preset-env',
      {
        // 按需加载 polyfill
        useBuiltIns: 'usage',
        // core-js 版本
        corejs: 3,
        // 目标浏览器
        targets: {
          browsers: [
            'last 2 versions',
            '> 1%',
            'not dead',
          ],
        },
      },
    ],

    // ----- @babel/preset-react -----
    // 处理 JSX 语法
    [
      '@babel/preset-react',
      {
        // 使用新的 JSX 转换（React 17+）
        runtime: 'automatic',
      },
    ],

    // ----- @babel/preset-typescript -----
    // 处理 TypeScript 语法
    [
      '@babel/preset-typescript',
      {
        // 启用仅类型导入优化
        onlyRemoveTypeImports: true,
      },
    ],
  ],

  // ==================== 插件配置 ====================
  plugins: [
    // 可以在这里添加其他 Babel 插件
    // 例如：'@babel/plugin-proposal-decorators' 用于装饰器语法
  ],
};

