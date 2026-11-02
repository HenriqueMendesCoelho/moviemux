let pending = 0;
function update(message = '') {
  if (import.meta.client)
    window.dispatchEvent(
      new CustomEvent('moviemux:loading', { detail: { active: pending > 0, message } }),
    );
}
export function showLoading() {
  pending++;
  update();
}
export function hideLoading() {
  pending = Math.max(0, pending - 1);
  update();
}
export function showLoadingWithMessage(message: string) {
  pending++;
  update(message);
}
