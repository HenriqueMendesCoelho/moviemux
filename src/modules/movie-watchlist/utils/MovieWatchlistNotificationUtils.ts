import { Notify } from 'quasar';

function notificationReorder() {
  Notify.create({
    icon: 'announcement',
    color: 'grey-mid',
    message: 'Reordene sua lista! Arraste e solte as imagens para organizá-las como desejar',
    position: 'top',
    progress: true,
    timeout: 8000,
    actions: [
      {
        icon: 'close',
        color: 'white',
      },
    ],
  });
}

type ConfirmReorderCallbacks = {
  done: () => void;
  cancel: () => void;
};

function confirmReorder(callback: ConfirmReorderCallbacks) {
  Notify.create({
    color: 'grey-mid',
    message: 'Deseja salvar a ordenação?',
    position: 'bottom',
    timeout: 0,
    multiLine: false,
    actions: [
      {
        icon: 'done',
        color: 'white',
        handler() {
          callback.done();
        },
      },
      {
        icon: 'close',
        color: 'white',
        handler() {
          callback.cancel();
        },
      },
    ],
  });
}

export { notificationReorder, confirmReorder };
