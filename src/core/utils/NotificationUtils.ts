import { Notify } from 'quasar';

export function showError(message: string, timeout = 5000) {
  Notify.create({
    type: 'negative',
    message: message,
    position: 'top',
    timeout: timeout,
  });
}
export function showSuccess(message: string, timeout = 5000) {
  Notify.create({
    type: 'positive',
    message: message,
    position: 'top',
    timeout: timeout,
  });
}
export function showInfo(message: string, timeout = 5000) {
  Notify.create({
    type: 'info',
    message: message,
    position: 'top',
    timeout: timeout,
  });
}
export function showWarning(message: string, timeout = 5000) {
  Notify.create({
    type: 'warning',
    message: message,
    position: 'top',
    timeout: timeout,
  });
}
