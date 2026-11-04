import { notifyAction } from 'src/core/utils/NotificationUtils';
type Translator = (key: string, params?: Record<string, string>) => string;
type NotifyRouteToMovie = { movieTitle: string; handler?: () => void; t: Translator };
export function notifyRouteToMovie({ movieTitle, handler, t }: NotifyRouteToMovie) {
  notifyAction(
    () => t('catalog.movie.addedNotification', { title: movieTitle }),
    () => t('catalog.movie.viewMovie'),
    () => handler?.(),
  );
}
