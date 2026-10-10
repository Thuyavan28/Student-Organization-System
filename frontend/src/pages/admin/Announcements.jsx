import { useState } from 'react';
import { LuArchive, LuBell, LuBookmark, LuSend } from 'react-icons/lu';
import { announcementsApi } from '../../api/announcements.api';
import { apiErrorMessage, apiFieldErrors } from '../../api/axiosInstance';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { PageHeader } from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ErrorState } from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
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
  const [toArchive, setToArchive] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const history = useFetch(() => announcementsApi.history({ page, pageSize: 10 }), [page]);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const publish = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.title.trim().length < 3) found.title = 'Enter a title';
    if (form.body.trim().length < 5) found.body = 'Write the announcement';
    setErrors(found);
    if (Object.keys(found).length) return;

    setPosting(true);
    try {
      const body = await announcementsApi.create({ ...form, title: form.title.trim(), body: form.body.trim() });
      const sent = body.data?.emailRecipientCount;
      toast.success(sent != null ? `Published and emailed to ${sent} recipients` : 'Announcement published');
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
      history.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const archive = async () => {
    setArchiving(true);
    try {
      await announcementsApi.archive(toArchive.id);
      toast.success('Announcement archived. It stays in the history.');
      setToArchive(null);
      history.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setArchiving(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Announcement',
      render: (row) => (
        <div className="max-w-xs">
          <p className="flex items-center gap-2 font-medium text-slate-900">
            {row.title}
            {row.isPinned && <LuBookmark className="text-primary-600" aria-label="Pinned" />}
          </p>
          <p className="line-clamp-2 text-xs text-slate-500">{row.body}</p>
        </div>
      ),
    },
    { key: 'publishedAt', header: 'Sent', render: (row) => formatDateTime(row.publishedAt) },
    { key: 'author', header: 'Author', render: (row) => row.author?.name ?? '-' },
    { key: 'audience', header: 'Audience', render: (row) => <Badge tone="gray">{row.audience === 'ALL_USERS' ? 'Everyone' : 'Members'}</Badge> },
    {
      key: 'recipients',
      header: 'Email',
      render: (row) => {
        const log = row.emailLogs?.[0];
        return (
          <div className="text-xs">
            <p className="tabular-nums">{log?.recipientCount ?? row.emailRecipientCount} recipients</p>
            <p className="text-slate-500">{log ? log.status.toLowerCase() : row.emailSent ? 'sent' : 'not sent'}</p>
          </div>
        );
      },
    },
    {
      key: 'state',
      header: 'State',
      render: (row) => (row.archivedAt ? <Badge tone="gray">Archived</Badge> : <Badge tone="green">Live</Badge>),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.archivedAt ? null : (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" icon={LuBookmark} onClick={() => togglePin(row)}>{row.isPinned ? 'Unpin' : 'Pin'}</Button>
            <Button size="sm" variant="ghost" icon={LuArchive} onClick={() => setToArchive(row)}>Archive</Button>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Announcements" subtitle="Post once. It appears in the feed immediately and is emailed to the audience." />
      <div className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <Card title="Compose">
          <form onSubmit={publish} noValidate className="space-y-4">
            <Input label="Title" value={form.title} onChange={set('title')} error={errors.title} />
            <Input label="Message" as="textarea" rows={6} value={form.body} onChange={set('body')} error={errors.body} />
            <Select
              label="Audience"
              value={form.audience}
              onChange={set('audience')}
              options={[
                { value: 'ALL_MEMBERS', label: 'Active members' },
                { value: 'ALL_USERS', label: 'Everyone with an account' },
              ]}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isPinned} onChange={(event) => setForm((current) => ({ ...current, isPinned: event.target.checked }))} />
              Pin to the top of the feed
            </label>
            <Button type="submit" icon={LuSend} loading={posting}>Publish and email</Button>
          </form>
        </Card>

        <Card title="Sent history" subtitle="Nothing here is ever deleted." padded={false}>
          {history.error ? (
            <ErrorState message={history.error} onRetry={history.reload} />
          ) : (
            <>
              <Table
                columns={columns}
                rows={history.data}
                loading={history.loading}
                emptyIcon={LuBell}
                emptyTitle="Nothing posted yet"
                emptyMessage="Your first announcement will be listed here with its send date and recipient count."
              />
              <Pagination meta={history.meta} onPage={setPage} />
            </>
          )}
        </Card>
      </div>
      <ConfirmDialog
        open={Boolean(toArchive)}
        title="Archive announcement"
        message={`"${toArchive?.title}" will leave the public feed but stay in this history.`}
        confirmLabel="Archive"
        loading={archiving}
        onConfirm={archive}
        onCancel={() => setToArchive(null)}
      />
    </>
  );
}
