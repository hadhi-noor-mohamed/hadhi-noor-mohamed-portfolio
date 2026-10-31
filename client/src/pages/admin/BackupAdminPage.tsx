import { useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, DatabaseBackup, Download, FileUp, HardDriveDownload, ShieldCheck, UploadCloud } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminPageHeader, AdminSection } from '@/components/admin/AdminUI';

interface BackupPayload {
  version: number;
  exportedAt?: string;
  application?: string;
  counts: Record<string, number>;
  data: Record<string, unknown>;
  notice?: string;
}

interface PreviewResult {
  valid: boolean;
  version: number;
  exportedAt: string | null;
  counts: Record<string, number>;
  currentCounts: Record<string, number>;
  summary: {
    projects: Array<{ title: string; state: string }>;
    skills: string[];
    posts: Array<{ title: string; state: string }>;
    resumes: number;
  };
}

const MODE_OPTIONS = [
  { value: 'replace', label: 'Replace — wipe current content, then restore' },
  { value: 'merge', label: 'Merge — add records that do not already exist' },
];

const MODEL_LABELS: Record<string, string> = {
  profile: 'Profile',
  socialLink: 'Social links',
  navigationItem: 'Navigation',
  skillCategory: 'Skill categories',
  skill: 'Skills',
  project: 'Projects',
  projectImage: 'Project images',
  projectDocument: 'Project documents',
  timelineEntry: 'Timeline entries',
  certification: 'Certifications',
  achievement: 'Achievements',
  journeyEntry: 'Journey entries',
  blogPost: 'Blog posts',
  blogTag: 'Blog tags',
  pageSection: 'Page sections',
  themeConfiguration: 'Themes',
  siteSettings: 'Site settings',
  resumeVersion: 'Resume versions',
  mediaAsset: 'Media records',
};

export function AdminBackupPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [payload, setPayload] = useState<BackupPayload | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const exportBackup = async () => {
    setExporting(true);
    try {
      const result = await api.get<BackupPayload>('/api/admin/backup');
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio-backup-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;
      const result = await api.post<PreviewResult>('/api/admin/backup/preview', { payload: parsed });
      setPayload(parsed);
      setPreview(result.data);
      toast.success('Backup file validated');
    } catch (error) {
      setPayload(null);
      setPreview(null);
      toast.error(errorMessage(error));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const restore = async () => {
    if (!payload) return;
    setRestoring(true);
    try {
      await api.post('/api/admin/backup/restore', { payload, confirm: true, mode });
      toast.success('Restore complete');
      setConfirmRestore(false);
      setPayload(null);
      setPreview(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      <AdminPageHeader title="Backup & restore" description="Export a JSON snapshot of your content, or restore from a previous export." />

      <div className="mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
        <span>
          A backup contains your database records only. Uploaded files (images, PDFs, videos) live in object storage — back up your storage bucket (or the local
          storage directory) separately. Secrets and credentials are never included in an export.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title="Export backup" description="Download the current content as a portable JSON file.">
          <ul className="mb-4 space-y-1.5 text-sm" style={{ color: 'var(--muted)' }}>
            <li className="flex items-center gap-2">
              <DatabaseBackup className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" /> Profile, projects, skills, timeline, blog, journey
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" /> Page sections, theme, settings and resume versions
            </li>
            <li className="flex items-center gap-2">
              <HardDriveDownload className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" /> Media records (not the files themselves)
            </li>
          </ul>
          <Button onClick={() => void exportBackup()} loading={exporting} iconLeft={<Download className="h-4 w-4" aria-hidden="true" />}>
            Download backup
          </Button>
        </AdminSection>

        <AdminSection title="Restore from backup" description="Validate a backup file, then choose how to apply it.">
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void loadFile(e)} aria-hidden="true" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm transition hover:border-[var(--brand-primary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            <FileUp className="h-6 w-6 opacity-60" aria-hidden="true" />
            Choose a backup JSON file
          </button>

          {preview ? (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Valid backup</Badge>
                <Badge variant="muted">version {preview.version}</Badge>
                {preview.exportedAt ? <Badge variant="muted">exported {new Date(preview.exportedAt).toLocaleString()}</Badge> : null}
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="px-3 py-2 text-left font-medium">Record</th>
                      <th className="px-3 py-2 text-right font-medium">Now</th>
                      <th className="px-3 py-2 text-right font-medium">In backup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(preview.counts).map((model) => (
                      <tr key={model} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-3 py-1.5">{MODEL_LABELS[model] ?? model}</td>
                        <td className="px-3 py-1.5 text-right" style={{ color: 'var(--muted)' }}>
                          {preview.currentCounts[model] ?? 0}
                        </td>
                        <td className="px-3 py-1.5 text-right">{preview.counts[model] ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Field label="Restore mode" htmlFor="restore-mode">
                <Select id="restore-mode" value={mode} onChange={(e) => setMode(e.target.value as 'replace' | 'merge')} options={MODE_OPTIONS} />
              </Field>

              {preview.summary.projects.length || preview.summary.posts.length ? (
                <div className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                  {preview.summary.projects.length ? <p>Projects: {preview.summary.projects.map((p) => p.title).join(', ')}</p> : null}
                  {preview.summary.posts.length ? <p>Posts: {preview.summary.posts.map((p) => p.title).join(', ')}</p> : null}
                </div>
              ) : null}

              <Button variant="danger" onClick={() => setConfirmRestore(true)} iconLeft={<UploadCloud className="h-4 w-4" aria-hidden="true" />}>
                Restore this backup
              </Button>
            </div>
          ) : null}
        </AdminSection>
      </div>

      <ConfirmDialog
        open={confirmRestore}
        title="Restore backup?"
        description={
          mode === 'replace'
            ? 'This will delete your current content and replace it with the backup. This cannot be undone unless you have another backup.'
            : 'This will merge records from the backup into your current content, skipping ones that already exist.'
        }
        destructive
        confirmLabel="Restore backup"
        requireText="RESTORE"
        loading={restoring}
        onConfirm={() => void restore()}
        onCancel={() => setConfirmRestore(false)}
      />
    </div>
  );
}
