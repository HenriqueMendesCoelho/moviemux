import http from '~/core/http';
import { isRegistrationMode, type RegistrationMode } from '~/core/registration-mode';

export default {
  async mode(signal?: AbortSignal): Promise<RegistrationMode> {
    const response = await http.get('/public/registration-mode', { signal });
    const data: unknown = response.data;
    if (
      response.status !== 200 ||
      !data ||
      typeof data !== 'object' ||
      Object.keys(data).length !== 1 ||
      !('mode' in data) ||
      !isRegistrationMode(data.mode)
    ) {
      throw new Error('Unconfirmed registration policy');
    }
    return data.mode;
  },
  async waitlist(email: string, token: string): Promise<void> {
    const response = await http.post('/public/registration-waitlist', {
      email,
      'cf-turnstile-response': token,
    });
    if (response.status !== 202 || (response.data !== '' && response.data != null)) {
      throw new Error('Unconfirmed waitlist request');
    }
  },
};
