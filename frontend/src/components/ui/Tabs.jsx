export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2 mb-6 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg focus-visible:ring-offset-2 ${
              isActive ? 'bg-cf-fg text-white' : 'text-cf-fg hover:bg-cf-hover'
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  isActive ? 'bg-white/20 text-white' : 'bg-cf-subtle text-cf-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
