import { useTheme } from '../../context/ThemeContext';

export default function Background() {
  const { isDark } = useTheme();

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Dark mode ambient orbs */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isDark ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary-500/10 blur-[120px] animate-float-slow" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-accent-500/10 blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] rounded-full bg-primary-600/8 blur-[150px] animate-float-slow" style={{ animationDelay: '-5s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-accent-600/8 blur-[100px] animate-float" style={{ animationDelay: '-2s' }} />
      </div>

      {/* Light mode subtle orbs */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isDark ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary-400/5 blur-[120px] animate-float-slow" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-accent-400/5 blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] rounded-full bg-primary-500/4 blur-[150px] animate-float-slow" style={{ animationDelay: '-5s' }} />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}