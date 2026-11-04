import pt from '../../../../i18n/locales/pt-BR/library.json';
import en from '../../../../i18n/locales/en/library.json';
import { showInfo } from 'src/core/utils/NotificationUtils';
export function notificationReorder() {
  showInfo('library.reorderHelp');
}
type ConfirmReorderCallbacks = { done: () => void; cancel: () => void };
/** Legacy callback entry point; the watchlist view now renders persistent Save/Cancel controls. */
export function confirmReorder(callback: ConfirmReorderCallbacks, locale = 'pt-BR') {
  if (typeof window !== 'undefined' && window.confirm((locale === 'en' ? en : pt).confirmSaveOrder))
    callback.done();
  else callback.cancel();
}
