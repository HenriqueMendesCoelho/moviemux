import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { safeReturnPath } from '../../src/modules/login/utils/AccountUtils';
import LoginCreateAccountTab from '../../src/modules/login/components/LoginCreateAccountTab.vue';
import AdministratorInviteUserTab from '../../src/modules/administrator/components/AdministratorInviteUserTab.vue';
import AdministratorListUserTab from '../../src/modules/administrator/components/AdministratorListUserTab.vue';
import AdministratorUserTab from '../../src/modules/administrator/components/AdministratorUserTab.vue';
import LoginForm from '../../src/modules/login/components/LoginForm.vue';
import LoginTab from '../../src/modules/login/components/LoginTab.vue';
import LoginDialog from '../../src/modules/login/components/LoginDialog.vue';
import ChangePasswordView from '../../src/modules/change-password/views/ChangePasswordView.vue';
import User from '../../src/core/domain/user/User';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  listUserInvites: vi.fn(),
  createUserInvite: vi.fn(),
  deleteUserInvite: vi.fn(),
  listUsersAdm: vi.fn(),
  deleteUser: vi.fn(),
  getUserAdm: vi.fn(),
  promoteUser: vi.fn(),
  demoteUser: vi.fn(),
  blockUser: vi.fn(),
  success: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  redefinePasswordByKey: vi.fn(),
  route: {
    name: 'login',
    path: '/',
    query: { from: undefined as unknown },
    params: { key: 'k'.repeat(200) },
  },
}));
vi.mock('src/core/services/UserService', () => ({ default: mocks }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showSuccess: mocks.success }));
vi.mock('src/core/stores/UserStore', () => ({
  useUserStore: () => ({ user: { id: 'current-admin' }, login: mocks.login, logout: mocks.logout }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

const wrappers: VueWrapper[] = [];
function track<T extends VueWrapper>(wrapper: T): T {
  wrappers.push(wrapper);
  return wrapper;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.login.mockResolvedValue(undefined);
  mocks.push.mockResolvedValue(undefined);
  mocks.replace.mockResolvedValue(undefined);
  mocks.route.name = 'login';
  mocks.route.path = '/';
  mocks.route.query.from = undefined;
  mocks.listUserInvites.mockResolvedValue([]);
  mocks.listUsersAdm.mockResolvedValue([]);
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

describe('safe account return navigation', () => {
  it.each(['/movie/42', '/movie/discover?movie=123', '/profile#security'])(
    'preserves internal %s',
    (target) => expect(safeReturnPath(target)).toBe(target),
  );
  it.each([
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/\n/example.com',
    'javascript:alert(1)',
    '',
    null,
    ['//example.com'],
  ])('rejects unsafe input %s', (target) => expect(safeReturnPath(target)).toBe('/home'));
});

describe('invitation account creation', () => {
  it('preserves password reveals and prevents duplicate pending submissions', async () => {
    const request = deferred<void>();
    mocks.create.mockReturnValue(request.promise);
    const wrapper = track(mount(LoginCreateAccountTab));
    await wrapper.get('input[type="email"]').setValue('person@example.com');
    await wrapper.get('input[autocomplete="nickname"]').setValue('cinefilo');
    const passwords = wrapper.findAll('input[autocomplete="new-password"]');
    await passwords[0]!.setValue('Strong123!');
    await passwords[1]!.setValue('Strong123!');
    await wrapper.get('input[autocomplete="off"]').setValue('invite-code');
    const reveal = wrapper.findAll('button').find((button) => button.text() === 'Mostrar')!;
    await reveal.trigger('click');
    expect(passwords[0]!.attributes('type')).toBe('text');
    await wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith({
      name: 'cinefilo',
      email: 'person@example.com',
      password: 'Strong123!',
      invite_code: 'invite-code',
    });
    request.resolve();
    await flushPromises();
    expect(wrapper.emitted('changeTab')).toEqual([['login']]);
  });
  it('does not call the endpoint for mismatching passwords', async () => {
    const wrapper = track(mount(LoginCreateAccountTab));
    const passwords = wrapper.findAll('input[autocomplete="new-password"]');
    await passwords[0]!.setValue('Strong123!');
    await passwords[1]!.setValue('Different123!');
    await wrapper.get('form').trigger('submit');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(wrapper.get('[role="alert"]').text()).toContain('iguais');
  });
});

describe('administrator invitation outcomes', () => {
  it('does not misreport a successful creation when list refresh fails', async () => {
    mocks.listUserInvites
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('refresh failed'));
    mocks.createUserInvite.mockResolvedValue({ code: 'created-code' });
    const wrapper = track(mount(AdministratorInviteUserTab));
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Gerar convite')!
      .trigger('click');
    await flushPromises();
    expect(mocks.createUserInvite).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledWith('Convite criado.');
    expect(wrapper.get('[role="alert"]').text()).toContain('Convite criado.');
    expect(wrapper.text()).toContain('created-code');
  });
  it('cancelling deletion performs no mutation', async () => {
    mocks.listUserInvites.mockResolvedValue([{ code: 'keep-me' }]);
    window.confirm = vi.fn(() => false);
    const wrapper = track(mount(AdministratorInviteUserTab));
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Excluir')!
      .trigger('click');
    expect(mocks.deleteUserInvite).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('keep-me');
  });
});

describe('administrator users', () => {
  it('bounds table rows and preserves filtering and paging', async () => {
    mocks.listUsersAdm.mockResolvedValue(
      Array.from(
        { length: 45 },
        (_, index) => new User(String(index), `Pessoa ${index}`, `user${index}@example.com`),
      ),
    );
    const wrapper = track(mount(AdministratorListUserTab));
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(20);
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Próxima')!
      .trigger('click');
    expect(wrapper.findAll('tbody tr')).toHaveLength(20);
    expect(wrapper.text()).toContain('Página 2 de 3');
    await wrapper.get('input[type="search"]').setValue('user44@');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.text()).toContain('Página 1 de 1');
  });
  it('uses only the selected target and disables target editing during mutation', async () => {
    const target = new User('selected-id', 'Pessoa', 'person@example.com');
    mocks.getUserAdm.mockResolvedValue(target);
    const request = deferred<User>();
    mocks.promoteUser.mockReturnValue(request.promise);
    window.confirm = vi.fn(() => true);
    const wrapper = track(mount(AdministratorUserTab));
    await wrapper.get('input[type="email"]').setValue(target.email);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Promover')!
      .trigger('click');
    expect(mocks.promoteUser).toHaveBeenCalledWith('selected-id');
    expect((wrapper.get('form input').element as HTMLInputElement).disabled).toBe(true);
    request.resolve({ ...target, roles: ['ADM'] });
    await flushPromises();
    expect((wrapper.get('form input').element as HTMLInputElement).disabled).toBe(false);
  });
});

describe('login session recovery', () => {
  it('returns to the requested internal route and rejects external returns', async () => {
    mocks.route.query.from = '/movie/42';
    const wrapper = track(mount(LoginTab));
    await wrapper.get('input[type="email"]').setValue('person@example.com');
    await wrapper.get('input[autocomplete="current-password"]').setValue('password');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.push).toHaveBeenLastCalledWith('/movie/42');
    mocks.route.query.from = '//untrusted.example';
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.push).toHaveBeenLastCalledWith('/home');
  });
  it('reloads the active protected page after modal reauthentication', async () => {
    mocks.route.name = 'profile';
    mocks.route.path = '/profile';
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    const wrapper = track(mount(LoginTab));
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it('logs out before leaving an expired-session dialog', async () => {
    const wrapper = track(
      mount(LoginDialog, { props: { modelValue: true }, global: { stubs: { LoginForm: true } } }),
    );
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith('/');
    expect(mocks.logout.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.replace.mock.invocationCallOrder[0]!,
    );
  });
  it('prevents exit while authentication is pending', async () => {
    const wrapper = track(
      mount(LoginDialog, { props: { modelValue: true }, global: { stubs: { LoginForm: true } } }),
    );
    wrapper.findComponent({ name: 'LoginForm' }).vm.$emit('loading', true);
    await flushPromises();
    expect((wrapper.get('button').element as HTMLButtonElement).disabled).toBe(true);
    await wrapper.get('button').trigger('click');
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});

describe('password reset contracts', () => {
  it('submits the URL key and account data once and returns to login', async () => {
    mocks.redefinePasswordByKey.mockResolvedValue(undefined);
    const wrapper = track(
      mount(ChangePasswordView, {
        global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
      }),
    );
    await wrapper.get('input[type="email"]').setValue('person@example.com');
    const passwords = wrapper.findAll('input[autocomplete="new-password"]');
    await passwords[0]!.setValue('Strong123!');
    await passwords[1]!.setValue('Strong123!');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(mocks.redefinePasswordByKey).toHaveBeenCalledWith('k'.repeat(200), {
      email: 'person@example.com',
      password: 'Strong123!',
    });
    expect(mocks.push).toHaveBeenCalledWith('/');
  });
});

it('moves keyboard focus to the new account panel heading', async () => {
  const wrapper = track(mount(LoginForm, { attachTo: document.body }));
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Esqueci minha senha')!
    .trigger('click');
  await flushPromises();
  const heading = wrapper.get('h2');
  expect(heading.text()).toBe('Vamos te trazer de volta.');
  expect(document.activeElement).toBe(heading.element);
});
