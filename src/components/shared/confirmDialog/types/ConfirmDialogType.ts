export type ConfirmDialogRefType = {
  dialog: (message: string, focus?: 'ok' | 'cancel' | 'none', title?: string, ok?: string, cancel?: string, persisstent?: boolean) => void;
};
