import { showInfo } from 'src/core/utils/NotificationUtils';
export function notificationReorder() {
  showInfo('Arraste os filmes ou use as setas para reordenar. Salve ou cancele na barra da lista.');
}
type ConfirmReorderCallbacks = { done: () => void; cancel: () => void };
/** Legacy callback entry point; the watchlist view now renders persistent Save/Cancel controls. */
export function confirmReorder(callback: ConfirmReorderCallbacks) {
  if (typeof window !== 'undefined' && window.confirm('Deseja salvar a ordenação?'))
    callback.done();
  else callback.cancel();
}
