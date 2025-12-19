/**
 * StageConfirmationDialog - Modal dialog for confirming stage transitions
 * Shows warnings, required checklist items, and allows bypass with reason
 */

import { useState, useEffect } from 'react';
import type { ChecklistItem } from './StageChecker';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@leaselab/ui-components';

export type StageTransition = {
  fromStage: string;
  fromStageLabel: string;
  toStage: string;
  toStageLabel: string;
};

type StageConfirmationDialogProps = {
  isOpen: boolean;
  transition: StageTransition | null;
  checklistItems: ChecklistItem[];
  warnings?: string[];
  canBypass?: boolean;
  onConfirm: (bypassReason?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export function StageConfirmationDialog({
  isOpen,
  transition,
  checklistItems,
  warnings = [],
  canBypass = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: StageConfirmationDialogProps) {
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [bypassReason, setBypassReason] = useState('');

  const requiredItems = checklistItems.filter((item) => item.required);
  const incompleteRequired = requiredItems.filter((item) => !item.checked);
  const hasIncomplete = incompleteRequired.length > 0;

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowBypassInput(false);
      setBypassReason('');
    }
  }, [isOpen]);

  if (!transition) return null;

  const handleConfirm = () => {
    if (hasIncomplete && showBypassInput) {
      onConfirm(bypassReason);
    } else {
      onConfirm();
    }
  };

  const canProceed = !hasIncomplete || (showBypassInput && bypassReason.trim().length >= 10);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm Stage Transition</DialogTitle>
          <DialogDescription>Review requirements before moving the application.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground mb-3">You are about to move this application:</p>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">From</p>
                <Badge variant="secondary">{transition.fromStageLabel}</Badge>
              </div>
              <svg className="mx-auto h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="flex-1 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">To</p>
                <Badge>{transition.toStageLabel}</Badge>
              </div>
            </div>
          </div>

          {warnings.length > 0 && (
            <Alert variant="warning">
              <svg className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {hasIncomplete ? (
            <div className="space-y-3">
              <Alert variant="destructive">
                <svg className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <AlertTitle>Required items not completed</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {incompleteRequired.map((item) => (
                      <li key={item.id}>{item.label}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
              {canBypass && !showBypassInput ? (
                <Button variant="link" className="px-0" onClick={() => setShowBypassInput(true)}>
                  Bypass requirements with reason
                </Button>
              ) : null}
              {showBypassInput && (
                <div className="space-y-2">
                  <Label htmlFor="bypassReason">
                    Bypass Reason <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="bypassReason"
                    value={bypassReason}
                    onChange={(e) => setBypassReason(e.target.value)}
                    rows={3}
                    placeholder="Explain why you're bypassing these requirements (minimum 10 characters)"
                  />
                  <p className="text-xs text-muted-foreground">{bypassReason.length} / 10 characters minimum</p>
                </div>
              )}
            </div>
          ) : (
            <Alert variant="success">
              <svg className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <AlertDescription>All required items are complete. You can proceed with this transition.</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canProceed || isLoading}>
            {isLoading ? 'Processing...' : hasIncomplete && showBypassInput ? 'Bypass & Proceed' : 'Confirm Transition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
