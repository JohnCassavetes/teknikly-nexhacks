'use client';

interface NavbarProps {
  children?: React.ReactNode;
  className?: string;
}

// Interview types
const interviewTypes = [
  { id: 'programming', label: 'Coding' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'technical', label: 'Technical' },
];

// Presentation types
const presentationTypes = [
  { id: 'pitch', label: 'Sales Pitch' },
  { id: 'business', label: 'Business' },
  { id: 'comedy', label: 'Stand-up Comedy' },
  { id: 'school', label: 'School Project' },
];

export default function Navbar({ children, className = '' }: NavbarProps) {
  return (
    <header className={`p-4 sticky top-0 bg-gray-950/50 backdrop-blur-lg z-10 ${className}`}>
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-sky-500 bg-clip-text text-transparent">
              Teknikly
            </h1>
          </a>
        </div>
        <nav className="flex items-center gap-6">
          {/* Presentations Dropdown */}
          <div className="relative group">
            <button className="text-gray-300 hover:text-white transition-colors py-2">
              Presentations
            </button>
            <div className="absolute left-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
              {presentationTypes.map((type) => (
                <a
                  key={type.id}
                  href={`/practice?mode=presentation&type=${type.id}`}
                  className="block px-4 py-3 text-gray-300 hover:bg-blue-500/10 hover:text-white transition-colors"
                >
                  {type.label}
                </a>
              ))}
            </div>
          </div>

          {/* Interviews Dropdown */}
          <div className="relative group">
            <button className="text-gray-300 hover:text-white transition-colors py-2">
              Interviews
            </button>
            <div className="absolute right-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
              {interviewTypes.map((type) => (
                <a
                  key={type.id}
                  href={`/practice?mode=interview&type=${type.id}`}
                  className="block px-4 py-3 text-gray-300 hover:bg-blue-500/10 hover:text-white transition-colors"
                >
                  {type.label}
                </a>
              ))}
            </div>
          </div>

          {children && (
            <>
              {children}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
