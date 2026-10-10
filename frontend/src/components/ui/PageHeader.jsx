import { LuChevronLeft } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function PageHeader({ title, description, actions, backTo }) {
  const navigate = useNavigate();
  return (
    <div className="mb-8">
      {backTo && (
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="mb-3 flex items-center gap-1.5 text-sm text-cf-muted hover:text-cf-fg transition-colors"
        >
          <LuChevronLeft className="h-4 w-4" />
          Back
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cf-fg">{title}</h1>
          {description && <p className="mt-1 text-sm text-cf-muted">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
