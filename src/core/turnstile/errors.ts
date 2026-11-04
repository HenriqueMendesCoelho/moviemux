import axios from 'axios';
/** Display only local copy; upstream/error bodies may contain sensitive diagnostics. */
export function verificationFailureMessage(
  error: unknown,
  t?: (key: string) => string,
): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  if (error.response?.status === 503)
    return (
      t?.('shell.verificationUnavailable') ??
      'O serviço de acesso está temporariamente indisponível. Aguarde um momento e tente novamente.'
    );
  if (error.response?.status === 403)
    return (
      t?.('shell.verificationUnauthorized') ??
      'Não foi possível autorizar esta tentativa. Conclua a verificação de segurança novamente e tente de novo.'
    );
  return undefined;
}
