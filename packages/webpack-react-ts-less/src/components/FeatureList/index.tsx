import styles from './index.module.less';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: '📦',
    title: 'Webpack 5',
    description: '最新版本的 Webpack，支持模块联邦、持久化缓存等新特性',
  },
  {
    icon: '⚛️',
    title: 'React 18',
    description: '使用 React 18 新特性，包括并发渲染和自动批处理',
  },
  {
    icon: '🔷',
    title: 'TypeScript',
    description: '完整的 TypeScript 支持，提供类型检查和智能提示',
  },
  {
    icon: '🎨',
    title: 'Less',
    description: '支持 Less 预处理器和 CSS Modules，样式开发更高效',
  },
  {
    icon: '🔥',
    title: '热更新',
    description: '开发环境支持 HMR，代码修改实时生效，无需刷新页面',
  },
  {
    icon: '📊',
    title: '代码分割',
    description: '自动分割代码，按需加载，优化首屏加载速度',
  },
];

const FeatureList: React.FC = () => {
  return (
    <section className={styles.features} id="features">
      <h2 className={styles.sectionTitle}>✨ 项目特性</h2>
      
      <div className={styles.grid}>
        {features.map((feature, index) => (
          <div 
            key={index} 
            className={styles.card}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <span className={styles.icon}>{feature.icon}</span>
            <h3 className={styles.title}>{feature.title}</h3>
            <p className={styles.description}>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeatureList;

