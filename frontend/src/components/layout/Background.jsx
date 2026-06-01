import { useTheme } from '../../context/ThemeContext';

export default function Background({ children }) {
  const { isDark } = useTheme();

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isDark
              ? 'opacity-100'
              : 'opacity-0'
          }`}
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 0% 20%, rgba(88, 28, 135, 0.25) 0%, transparent 50%),
              radial-gradient(ellipse 60% 50% at 100% 30%, rgba(147, 51, 234, 0.2) 0%, transparent 50%),
              radial-gradient(ellipse 70% 40% at 50% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse 50% 40% at 80% 70%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)
            `,
          }}
        />
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            isDark
              ? 'opacity-0'
              : 'opacity-100'
          }`}
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 0% 20%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 50% at 100% 30%, rgba(99, 102, 241, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 70% 40% at 50% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse 50% 40% at 80% 70%, rgba(236, 72, 153, 0.05) 0%, transparent 50%)
            `,
          }}
        />
        <div
          className="absolute inset-0 animate-spin-slower opacity-30"
          style={{
            background: `
              radial-gradient(ellipse 40% 30% at 20% 50%, rgba(168, 85, 247, 0.12) 0%, transparent 50%),
              radial-gradient(ellipse 30% 40% at 70% 60%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)
            `,
          }}
        />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
