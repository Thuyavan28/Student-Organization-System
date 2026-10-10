// Card: DataCard with a padded body by default or modular compound card
import DataCard, { DataCardBody } from './DataCard';

export default function Card({ padded = true, children, ...props }) {
  return <DataCard {...props}>{padded ? <DataCardBody>{children}</DataCardBody> : children}</DataCard>;
}

export function CardHeader({ title, subtitle, action, actions, className = '' }) {
  const headerAction = action || actions;
  return (
    <div className={`flex items-center justify-between gap-4 border-b border-cf-border/60 px-6 py-4 ${className}`}>
      <div className="min-w-0">
        {title && <h2 className="text-base font-bold tracking-tight text-cf-fg">{title}</h2>}
        {subtitle && <p className="mt-0.5 text-xs text-cf-muted">{subtitle}</p>}
      </div>
      {headerAction && <div className="flex flex-shrink-0 items-center gap-2">{headerAction}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export { default as PageHeader } from './PageHeader';
