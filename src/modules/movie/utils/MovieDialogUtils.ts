// Compatibility helper for callers outside the movie module. The movie view uses an accessible inline form.
export type dialogMovieNote = {
  onOk: (data: string | undefined) => void;
  onCancel?: () => void;
  prompt?: string;
};
export function dialogMovieNote({
  onOk,
  onCancel,
  prompt = 'Insira uma nota inteira de 0 a 10',
}: dialogMovieNote) {
  if (typeof window === 'undefined') return;
  const value = window.prompt(prompt);
  if (value === null) {
    onCancel?.();
    return;
  }
  const note = Number(value);
  if (value.trim() && Number.isInteger(note) && note >= 0 && note <= 10) onOk(String(note));
}
