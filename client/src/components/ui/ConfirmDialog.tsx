import { useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Field';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** When provided, the user must type this exact text to enable confirmation. */
  requireText?: string;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  loading,
  onConfirm,
  onCancel,
  requireText,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const blocked = Boolean(requireText) && typed.trim() !== requireText;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={typeof description === 'string' ? description : undefined}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} disabled={blocked}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeof description !== 'string' ? <div className="text-sm">{description}</div> : null}
      {requireText ? (
        <div className="mt-4 space-y-1">
          <label className="label" htmlFor="confirm-text">
            Type <span className="font-mono text-red-400">{requireText}</span> to confirm
          </label>
          <Input
            id="confirm-text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            className={cn('font-mono')}
          />
        </div>
      ) : null}
    </Modal>
  );
}
