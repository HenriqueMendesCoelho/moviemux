import { notifyAction } from 'src/core/utils/NotificationUtils';
type notifyRouteToMovie = { movieTitle: string; handler?: () => void };
export function notifyRouteToMovie({ movieTitle, handler }: notifyRouteToMovie) {
  notifyAction(`O filme “${movieTitle}” foi cadastrado.`, 'Acessar filme', () => handler?.());
}
