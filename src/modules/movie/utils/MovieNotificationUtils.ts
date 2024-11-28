import { Notify } from 'quasar';

type notifyRouteToMovie = { movieTitle: string; handler?: () => void };

export function notifyRouteToMovie({ movieTitle, handler }: notifyRouteToMovie) {
  Notify.create({
    progress: true,
    message: `Acesse o filme '${movieTitle}' que acabou de cadastrar!`,
    multiLine: true,
    position: 'bottom-left',
    color: 'grey-mid2',
    timeout: 10000,
    actions: [
      {
        label: 'Acessar',
        color: 'kb-primary',
        handler: () => {
          if (handler) {
            handler();
          }
        },
      },
    ],
  });
}
