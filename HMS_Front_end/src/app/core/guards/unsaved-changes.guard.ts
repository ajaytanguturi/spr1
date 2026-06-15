import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmModalService } from '../services/confirm-modal.service';

export interface CanComponentDeactivate {
  hasUnsavedChanges: () => boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component,
) => {

  if (!component || typeof component.hasUnsavedChanges !== 'function') {
    return true;
  }
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  const confirmModal = inject(ConfirmModalService);
  return confirmModal
    .open({
      title: 'Unsaved Changes',
      message:
        'You have unsaved changes on this form. Your entries are kept if you ' +
        'return, but do you want to leave this page now?',
      confirmText: 'Leave',
      cancelText: 'Stay',
      type: 'warning',
    })
    .then((result) => result.confirmed);
};
