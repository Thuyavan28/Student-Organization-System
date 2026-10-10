import { FiBookmark } from 'react-icons/fi';
import { formatDateTime } from '../../utils/formatDate';
import Badge from '../ui/Badge';

export default function AnnouncementCard({ announcement }) {
  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${announcement.isPinned ? 'border-primary-300 ring-1 ring-primary-100' : 'border-slate-200'}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {announcement.isPinned && (
          <Badge tone="blue">
            <FiBookmark className="mr-1 h-3 w-3" aria-hidden="true" /> Pinned
          </Badge>
        )}
        <Badge tone="gray">{announcement.audience === 'ALL_USERS' ? 'Everyone' : 'Members'}</Badge>
        <span className="text-xs text-slate-500">{formatDateTime(announcement.publishedAt)}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{announcement.title}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{announcement.body}</p>
      {announcement.author?.name && (
        <p className="mt-3 text-xs text-slate-500">Posted by {announcement.author.name}</p>
      )}
    </article>
  );
}
