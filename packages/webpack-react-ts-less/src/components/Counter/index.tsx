import { useState } from 'react';
import styles from './index.module.less';

const Counter: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <section className={styles.counter}>
      <h2 className={styles.title}>计数器示例</h2>
      <p className={styles.description}>
        这个组件演示了 React Hooks 的使用
      </p>
      
      <div className={styles.display}>
        <span className={styles.count}>{count}</span>
      </div>
      
      <div className={styles.buttons}>
        <button 
          className={`${styles.btn} ${styles.decrease}`}
          onClick={() => setCount(prev => prev - 1)}
        >
          减少 -
        </button>
        <button 
          className={`${styles.btn} ${styles.reset}`}
          onClick={() => setCount(0)}
        >
          重置
        </button>
        <button 
          className={`${styles.btn} ${styles.increase}`}
          onClick={() => setCount(prev => prev + 1)}
        >
          增加 +
        </button>
      </div>
    </section>
  );
};

export default Counter;

