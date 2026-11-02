export type Notification = {
  message: string;
  kind: string;
  timeout: number;
  action?: { label: string; handler: () => void };
};
function notify(message: string, kind: string, timeout: number, action?: Notification['action']) {
  if (import.meta.client)
    window.dispatchEvent(
      new CustomEvent('moviemux:notification', { detail: { message, kind, timeout, action } }),
    );
}
export const showError = (message: string, timeout = 5000) => notify(message, 'error', timeout);
export const showSuccess = (message: string, timeout = 5000) => notify(message, 'success', timeout);
export const showInfo = (message: string, timeout = 5000) => notify(message, 'info', timeout);
export const showWarning = (message: string, timeout = 5000) => notify(message, 'warning', timeout);
export const notifyAction = (message: string, label: string, handler: () => void) =>
  notify(message, 'info', 10000, { label, handler });
