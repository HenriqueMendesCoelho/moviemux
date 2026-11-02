import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { TurnstileOptions } from 'src/core/turnstile/client';
const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  create: vi.fn(),
  recover: vi.fn(),
  reset: vi.fn(),
  push: vi.fn(),
}));
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { turnstileEnabled: true, turnstileSiteKey: 'test' } }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/', query: {}, params: { key: 'k'.repeat(200) } }),
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => ({ login: mocks.login }) }));
vi.mock('src/core/services/UserService', () => ({
  default: {
    create: mocks.create,
    createRedefinePassowordKey: mocks.recover,
    redefinePasswordByKey: mocks.reset,
  },
}));
vi.mock('src/core/utils/NotificationUtils', () => ({ showSuccess: vi.fn() }));
import Login from 'src/modules/login/components/LoginTab.vue';
import Signup from 'src/modules/login/components/LoginCreateAccountTab.vue';
import Recover from 'src/modules/login/components/LoginForgotPasswordTab.vue';
import Reset from 'src/modules/change-password/views/ChangePasswordView.vue';
describe('protected account forms', () => {
  let options: TurnstileOptions;
  const resetWidget = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    window.turnstile = {
      render: vi.fn((_el, opts) => {
        options = opts;
        return 'widget';
      }),
      remove: vi.fn(),
      reset: resetWidget,
    };
  });
  it('login blocks missing tokens, submits once, and resets after bad credentials', async () => {
    let reject!: (error: Error) => void;
    mocks.login.mockImplementation(
      () =>
        new Promise((_resolve, rejectPromise) => {
          reject = rejectPromise;
        }),
    );
    const w = mount(Login);
    await flushPromises();
    await w.get('form').trigger('submit');
    expect(mocks.login).not.toHaveBeenCalled();
    options.callback('fresh');
    await flushPromises();
    await w.get('input[type=email]').setValue('person@example.com');
    await w.get('input[type=password]').setValue('pw');
    await w.get('form').trigger('submit');
    await w.get('form').trigger('submit');
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.login).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'pw',
      'cf-turnstile-response': 'fresh',
    });
    reject(new Error('bad credentials'));
    await flushPromises();
    expect(resetWidget).toHaveBeenCalledWith('widget');
    expect(w.get('button.mm-btn-primary').attributes('disabled')).toBeDefined();
    w.unmount();
  });
  it.each([503, 403])(
    'login reports %s without blaming credentials or leaking diagnostics',
    async (status) => {
      mocks.login.mockRejectedValue({
        isAxiosError: true,
        response: { status, data: { message: 'secret diagnostic' } },
      });
      const w = mount(Login);
      await flushPromises();
      options.callback('fresh');
      await flushPromises();
      await w.get('form').trigger('submit');
      await flushPromises();
      const message = w.get('[role="alert"]').text();
      expect(message).not.toContain('credenciais');
      expect(message).not.toContain('secret diagnostic');
      expect(message).toContain(status === 503 ? 'temporariamente indisponível' : 'verificação');
      expect(resetWidget).toHaveBeenCalled();
      w.unmount();
    },
  );
  it('signup uses its own action and challenge field while retaining invitation fields', async () => {
    mocks.create.mockResolvedValue(undefined);
    const w = mount(Signup);
    await flushPromises();
    expect(options.action).toBe('signup');
    const inputs = w.findAll('input');
    for (const [i, value] of [
      'person@example.com',
      'nickname',
      'Strong123!',
      'Strong123!',
      'invite',
    ].entries())
      await inputs[i]!.setValue(value);
    options.callback('signup-token');
    await flushPromises();
    await w.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.create).toHaveBeenCalledWith({
      email: 'person@example.com',
      name: 'nickname',
      password: 'Strong123!',
      invite_code: 'invite',
      'cf-turnstile-response': 'signup-token',
    });
    expect(resetWidget).toHaveBeenCalled();
    w.unmount();
  });
  it('recovery gates and consumes a dedicated challenge', async () => {
    mocks.recover.mockResolvedValue(undefined);
    const w = mount(Recover);
    await flushPromises();
    expect(options.action).toBe('password_recovery');
    await w.get('input').setValue('person@example.com');
    options.callback('recovery-token');
    await flushPromises();
    await w.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.recover).toHaveBeenCalledWith('person@example.com', 'recovery-token');
    expect(resetWidget).toHaveBeenCalled();
    w.unmount();
  });
  it('reset clears the challenge on manual clear and resets after submission', async () => {
    mocks.reset.mockResolvedValue(undefined);
    const w = mount(Reset, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    expect(options.action).toBe('password_reset');
    options.callback('unused');
    await flushPromises();
    await w.get('.mm-actions button[type=button]').trigger('click');
    expect(resetWidget).toHaveBeenCalled();
    const inputs = w.findAll('input');
    for (const [i, value] of ['person@example.com', 'Strong123!', 'Strong123!'].entries())
      await inputs[i]!.setValue(value);
    options.callback('reset-token');
    await flushPromises();
    await w.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.reset).toHaveBeenCalledWith('k'.repeat(200), {
      email: 'person@example.com',
      password: 'Strong123!',
      'cf-turnstile-response': 'reset-token',
    });
    w.unmount();
  });
});
