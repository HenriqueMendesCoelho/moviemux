import { Dialog } from 'quasar';

export type dialogMovieNote = { onOk: (data: string | undefined) => void; onCancel?: () => void };
export function dialogMovieNote({ onOk, onCancel }: dialogMovieNote) {
  Dialog.create({
    dark: true,
    message: 'Insira uma nota de 0 a 10',
    persistent: false,
    color: 'kb-primary',
    class: 'bg-grey-mid',
    prompt: {
      model: '',
      type: 'number',
      isValid: (val) => parseInt(val) >= 0 && parseInt(val) <= 10,
      min: '0',
      max: '10',
      step: '1',
    },
    ok: {
      label: 'Cadastrar',
      flat: true,
    },
    cancel: {
      label: 'Cancelar',
      flat: true,
    },
    seamless: false,
    focus: 'ok',
  })
    .onOk((data: string | undefined) => {
      onOk(data);
    })
    .onCancel(() => {
      if (!onCancel) {
        return;
      }

      onCancel();
    });
}
