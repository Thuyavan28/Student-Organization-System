export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-0 border-b border-cf-divider mb-6 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative pb-3 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg focus-visible:ring-offset-2 ${
              isActive
                ? 'text-cf-fg after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cf-fg'
                : 'text-cf-muted hover:text-cf-fg'
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  isActive ? 'bg-cf-fg text-white' : 'bg-cf-subtle text-cf-muted'
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
