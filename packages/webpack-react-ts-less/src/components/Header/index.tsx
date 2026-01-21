import styles from './index.module.less';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme }) => {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>📦</span>
        <span className={styles.logoText}>Webpack学习</span>
      </div>
      
      <nav className={styles.nav}>
        <a href="#features" className={styles.navLink}>特性</a>
        <a href="#docs" className={styles.navLink}>文档</a>
        <a href="#github" className={styles.navLink}>GitHub</a>
      </nav>

      <button 
        className={styles.themeToggle}
        onClick={onToggleTheme}
        aria-label="切换主题"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </header>
  );
};

export default Header;

