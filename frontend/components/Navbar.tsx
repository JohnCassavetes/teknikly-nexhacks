'use client';

interface NavbarProps {
  children?: React.ReactNode;
  className?: string;
}

export default function Navbar({ children, className = '' }: NavbarProps) {
  return (
    <header className={`p-4 border-b border-gray-800 sticky top-0 bg-gray-950/50 backdrop-blur-md z-10 ${className}`}>
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              TalkCoach
            </h1>
          </a>
        </div>
        {children && (
          <nav className="flex items-center gap-3">
            {children}
          </nav>
        )}
      </div>
    </header>
  );
}
