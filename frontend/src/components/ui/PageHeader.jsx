import { LuChevronLeft } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

// `subtitle` is accepted as an alias of `description` (both are used across pages).
export default function PageHeader({ title, description, subtitle, actions, backTo }) {
  const navigate = useNavigate();
  const text = description ?? subtitle;
  return (
    <div className="mb-8">
      {backTo && (
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="mb-3 flex items-center gap-1.5 text-sm text-cf-muted transition-colors hover:text-cf-fg"
        >
          <LuChevronLeft className="h-4 w-4" />
          Back
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-page-title text-cf-fg">{title}</h1>
          {text && <p className="mt-1 text-sm text-cf-muted">{text}</p>}
        </div>
        {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
