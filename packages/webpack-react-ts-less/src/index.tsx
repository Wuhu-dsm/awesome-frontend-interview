import { createRoot } from 'react-dom/client';
import App from './App';
// 导入全局样式
import './styles/global.less';

// 获取根节点
const container = document.getElementById('root');

if (!container) {
  throw new Error('未找到 root 节点，请检查 index.html');
}

// 创建 React 18 的 root
const root = createRoot(container);

// 渲染应用
root.render(<App />);

