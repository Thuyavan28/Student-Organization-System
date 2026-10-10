import { useState, useMemo } from 'react';
import {
  LuArchive,
  LuBell,
  LuBookmark,
  LuSend,
  LuSearch,
  LuMail,
  LuEye,
  LuUsers,
  LuCalendar,
  LuCircleCheck,
  LuSparkles,
} from 'react-icons/lu';
import { announcementsApi } from '../../api/announcements.api';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState, { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { formatDateTime } from '../../utils/formatDate';

const EMPTY = { title: '', body: '', audience: 'ALL_MEMBERS', isPinned: false };

export default function Announcements() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [posting, setPosting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'LIVE' | 'PINNED' | 'ARCHIVED'
  const [toArchive, setToArchive] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [viewModalItem, setViewModalItem] = useState(null);

  const history = useFetch(() => announcementsApi.history({ page, pageSize: 12 }), [page]);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const publish = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.title.trim().length < 3) found.title = 'Enter an announcement title';
    if (form.body.trim().length < 5) found.body = 'Write the message body';
    setErrors(found);
    if (Object.keys(found).length) return;

    setPosting(true);
    try {
      const body = await announcementsApi.create({
        ...form,
        title: form.title.trim(),
        body: form.body.trim(),
      });
      const sent = body.data?.emailRecipientCount;
      toast.success(
        sent != null
          ? `Broadcast published and delivered to ${sent} email recipients!`
          : 'Announcement published successfully!',
      );
      setForm(EMPTY);
      setPage(1);
      history.reload();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  const togglePin = async (row) => {
    try {
      await announcementsApi.update(row.id, { isPinned: !row.isPinned });
      toast.success(row.isPinned ? 'Announcement unpinned' : 'Announcement pinned to top of feed');
      history.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const archive = async () => {
    setArchiving(true);
    try {
      await announcementsApi.archive(toArchive.id);
      toast.success('Announcement archived. It remains safely in history.');
      setToArchive(null);
      history.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setArchiving(false);
    }
  };

  const announcementsList = Array.isArray(history.data) ? history.data : [];

  // Metrics
  const totalAnnouncements = history.meta?.total ?? announcementsList.length;
  const liveCount = announcementsList.filter((a) => !a.archivedAt).length;
  const pinnedCount = announcementsList.filter((a) => a.isPinned && !a.archivedAt).length;
  const totalRecipientsReached = announcementsList.reduce((sum, a) => {
    const logCount = a.emailLogs?.[0]?.recipientCount ?? a.emailRecipientCount ?? 0;
    return sum + logCount;
  }, 0);

  // Filtered rows for client search
  const filteredList = useMemo(() => {
    return announcementsList.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.author?.name?.toLowerCase().includes(q);

      if (statusFilter === 'PINNED') return matchesSearch && item.isPinned && !item.archivedAt;
      if (statusFilter === 'LIVE') return matchesSearch && !item.archivedAt;
      if (statusFilter === 'ARCHIVED') return matchesSearch && Boolean(item.archivedAt);
      return matchesSearch;
    });
  }, [announcementsList, search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements & Broadcasts"
        subtitle="Broadcast campus updates, email student members, and pin priority notices to the top of the feed."
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-cf-fg">Total Posts</p>
            <LuBell className="h-5 w-5 text-cf-muted" />
          </div>
          <p className="mt-2 text-stat-value text-cf-fg tabular-nums">{totalAnnouncements}</p>
          <p className="mt-0.5 text-xs text-cf-muted">All historical broadcasts</p>
        </div>

        <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-cf-fg">Live in Feed</p>
            <LuCircleCheck className="h-5 w-5 text-cf-fg" />
          </div>
          <p className="mt-2 text-stat-value text-cf-fg tabular-nums">{liveCount}</p>
          <p className="mt-0.5 text-xs text-cf-muted">Visible to students</p>
        </div>

        <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-cf-fg">Pinned</p>
            <LuBookmark className="h-5 w-5 text-cf-fg" />
          </div>
          <p className="mt-2 text-stat-value text-cf-fg tabular-nums">{pinnedCount}</p>
          <p className="mt-0.5 text-xs text-cf-muted">Featured notice</p>
        </div>

        <div className="rounded-2xl border border-cf-border bg-white p-6 transition-shadow hover:shadow-md ">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-cf-fg">Emails Sent</p>
            <LuMail className="h-5 w-5 text-cf-fg" />
          </div>
          <p className="mt-2 text-stat-value text-cf-fg tabular-nums">{totalRecipientsReached}</p>
          <p className="mt-0.5 text-xs text-cf-muted">Recipient deliveries</p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid gap-6 xl:grid-cols-[25rem_1fr]">
        {/* Left Column: Compose Broadcast Card */}
        <Card title="Compose Announcement" subtitle="Draft your update and broadcast to email subscribers.">
          <form onSubmit={publish} noValidate className="space-y-4">
            <Input
              label="Title"
              placeholder="e.g. Annual Fest Tickets Now Open!"
              value={form.title}
              onChange={set('title')}
              error={errors.title}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-cf-muted">Message Body</label>
                <span className="text-[11px] text-cf-muted font-mono">{form.body.length} chars</span>
              </div>
              <textarea
                rows={6}
                placeholder="Share event schedules, important deadlines, venue guidelines, and campus updates..."
                value={form.body}
                onChange={set('body')}
                className="w-full rounded-xl border border-cf-divider bg-white p-3 text-xs text-cf-fg placeholder:text-cf-muted focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 "
              />
              {errors.body && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.body}</p>}
            </div>

            <Select
              label="Target Audience"
              value={form.audience}
              onChange={set('audience')}
              options={[
                { value: 'ALL_MEMBERS', label: 'Active Club Members only' },
                { value: 'ALL_USERS', label: 'Everyone (All registered users)' },
              ]}
            />

            <label className="flex items-center gap-3 rounded-xl border border-cf-divider p-3 text-xs font-semibold text-cf-fg cursor-pointer hover:bg-cf-subtle transition-colors">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(event) => setForm((current) => ({ ...current, isPinned: event.target.checked }))}
                className="h-4 w-4 rounded text-cf-fg"
              />
              <span className="flex items-center gap-1.5">
                <LuBookmark className="h-4 w-4 text-amber-500" />
                Pin to the top of public announcement feed
              </span>
            </label>

            <Button type="submit" icon={LuSend} loading={posting} className="w-full">
              Publish & Broadcast via Email
            </Button>
          </form>
        </Card>

        {/* Right Column: Sent History & Controls */}
        <Card title="Broadcast History" subtitle="Sent messages and recipient logs." padded={false}>
          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-divider p-4 bg-cf-subtle">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'LIVE', label: 'Live' },
                { id: 'PINNED', label: 'Pinned' },
                { id: 'ARCHIVED', label: 'Archived' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    statusFilter === tab.id
                      ? 'bg-slate-900 text-white '
                      : 'bg-white text-cf-muted border border-cf-divider hover:bg-cf-subtle hover:text-cf-fg'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cf-muted" />
              <input
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-cf-divider bg-white py-1.5 pl-8 pr-3 text-xs text-cf-fg placeholder:text-cf-muted focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 "
              />
            </div>
          </div>

          {/* History Content */}
          {history.error ? (
            <ErrorState message={history.error} onRetry={history.reload} />
          ) : history.loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredList.length === 0 ? (
            <EmptyState
              icon={LuBell}
              title="No announcements found"
              message={
                search || statusFilter !== 'ALL'
                  ? 'No announcements match your filter. Try adjusting your search.'
                  : 'Compose your first broadcast to engage club members.'
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-cf-divider bg-cf-subtle text-[11px] font-semibold uppercase tracking-wider text-cf-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">
                        Announcement
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Sent Date
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Audience
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Email Reach
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        State
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cf-divider">
                    {filteredList.map((row) => {
                      const log = row.emailLogs?.[0];
                      const recipients = log?.recipientCount ?? row.emailRecipientCount ?? 0;

                      return (
                        <tr
                          key={row.id}
                          className="transition-colors hover:bg-cf-subtle cursor-pointer group"
                          onClick={() => setViewModalItem(row)}
                        >
                          {/* Announcement Title & Excerpt */}
                          <td className="px-5 py-3.5">
                            <div className="max-w-xs sm:max-w-sm">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-cf-fg group-hover:underline transition-colors">
                                  {row.title}
                                </span>
                                {row.isPinned && (
                                  <span
                                    title="Pinned Announcement"
                                    className="flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                                  >
                                    <LuBookmark className="h-3 w-3 mr-0.5" /> Pinned
                                  </span>
                                )}
                              </div>
                              <p className="line-clamp-1 mt-0.5 text-xs text-cf-muted">{row.body}</p>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="px-4 py-3.5 text-xs font-medium text-cf-muted whitespace-nowrap">
                            {formatDateTime(row.publishedAt)}
                          </td>

                          {/* Audience */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Badge tone={row.audience === 'ALL_USERS' ? 'blue' : 'gray'}>
                              {row.audience === 'ALL_USERS' ? 'Everyone' : 'Members'}
                            </Badge>
                          </td>

                          {/* Email Deliveries */}
                          <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <LuMail className="h-3.5 w-3.5 text-cf-muted" />
                              <span className="font-bold text-cf-fg tabular-nums">{recipients}</span>
                              <span className="text-cf-muted">delivered</span>
                            </div>
                          </td>

                          {/* State */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {row.archivedAt ? (
                              <Badge tone="gray">Archived</Badge>
                            ) : (
                              <Badge tone="green">Live in Feed</Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td
                            className="px-5 py-3.5 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={LuEye}
                                onClick={() => setViewModalItem(row)}
                                title="View full announcement"
                              />

                              {!row.archivedAt && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={LuBookmark}
                                    onClick={() => togglePin(row)}
                                    title={row.isPinned ? 'Unpin' : 'Pin to top'}
                                    className={row.isPinned ? 'text-amber-600' : ''}
                                  />

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={LuArchive}
                                    onClick={() => setToArchive(row)}
                                    title="Archive announcement"
                                    className="text-cf-muted hover:text-rose-600 hover:bg-rose-50"
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination meta={history.meta} onPage={setPage} />
            </>
          )}
        </Card>
      </div>

      {/* Read Full Announcement Modal */}
      {viewModalItem && (
        <Modal
          open={Boolean(viewModalItem)}
          onClose={() => setViewModalItem(null)}
          title={
            <div className="flex items-center gap-2">
              <span>{viewModalItem.title}</span>
              {viewModalItem.isPinned && (
                <span className="flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  <LuBookmark className="h-3 w-3 mr-0.5" /> Pinned
                </span>
              )}
            </div>
          }
          size="md"
          footer={
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-cf-muted">
                Posted by {viewModalItem.author?.name || 'Club Admin'}
              </span>
              <Button variant="secondary" onClick={() => setViewModalItem(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-cf-subtle p-3 text-xs text-cf-muted border border-cf-divider">
              <span className="flex items-center gap-1 font-medium">
                <LuCalendar className="h-3.5 w-3.5 text-cf-muted" />
                {formatDateTime(viewModalItem.publishedAt)}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <LuUsers className="h-3.5 w-3.5 text-cf-muted" />
                Audience: {viewModalItem.audience === 'ALL_USERS' ? 'All Registered Users' : 'Active Members'}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <LuMail className="h-3.5 w-3.5 text-cf-muted" />
                {viewModalItem.emailRecipientCount ?? 0} emails sent
              </span>
            </div>

            <div className="rounded-xl border border-cf-divider bg-white p-4 text-xs font-normal text-cf-fg leading-relaxed whitespace-pre-wrap">
              {viewModalItem.body}
            </div>
          </div>
        </Modal>
      )}

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(toArchive)}
        title="Archive announcement"
        message={`"${toArchive?.title}" will be hidden from the student live feed, but its delivery record remains preserved in the archive.`}
        confirmLabel="Archive"
        variant="danger"
        loading={archiving}
        onConfirm={archive}
        onCancel={() => setToArchive(null)}
      />
    </div>
  );
}
