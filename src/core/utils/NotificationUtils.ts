export type NotificationText = string | (() => string);
export type Notification = {
  message: NotificationText;
  kind: string;
  timeout: number;
  action?: { label: NotificationText; handler: () => void };
};
function notify(
  message: NotificationText,
  kind: string,
  timeout: number,
  action?: Notification['action'],
) {
  if (import.meta.client)
    window.dispatchEvent(
      new CustomEvent('moviemux:notification', { detail: { message, kind, timeout, action } }),
    );
}
export const showError = (message: NotificationText, timeout = 5000) =>
  notify(message, 'error', timeout);
export const showSuccess = (message: NotificationText, timeout = 5000) =>
  notify(message, 'success', timeout);
export const showInfo = (message: NotificationText, timeout = 5000) =>
  notify(message, 'info', timeout);
export const showWarning = (message: NotificationText, timeout = 5000) =>
  notify(message, 'warning', timeout);
export const notifyAction = (
  message: NotificationText,
  label: NotificationText,
  handler: () => void,
) => notify(message, 'info', 10000, { label, handler });
