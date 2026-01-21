import { useState } from 'react';
import Header from '@/components/Header';
import Counter from '@/components/Counter';
import FeatureList from '@/components/FeatureList';
import styles from './styles/App.module.less';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className={`${styles.app} ${styles[theme]}`}>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>
            🚀 Webpack + React + TypeScript + Less
          </h1>
          <p className={styles.subtitle}>
            这是一个用于学习 Webpack 配置的完整项目模板
          </p>
        </section>

        <Counter />
        
        <FeatureList />
      </main>

      <footer className={styles.footer}>
        <p>Made with ❤️ for learning Webpack</p>
      </footer>
    </div>
  );
};

export default App;

