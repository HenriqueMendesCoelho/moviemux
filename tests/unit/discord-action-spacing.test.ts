import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, compileStyle } from 'vue/compiler-sfc';
import { reactive } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import MovieContextMenuImage from 'src/modules/movie/components/MovieContextMenuImage.vue';

const mocks = vi.hoisted(() => ({
  user: { user: { id: 'owner', isLoged: true }, isAdmin: true },
  show: vi.fn(),
  sendDiscordMessage: vi.fn(),
  updateDiscordMessage: vi.fn(),
}));
vi.mock('src/core/stores/UserStore', () => ({ useUserStore: () => mocks.user }));
vi.mock('src/modules/movie/composables/useMovieContext', () => ({
  useMovieContext: () => ({ value: { id: 'film', portuguese_title: 'Filme de teste' } }),
}));
vi.mock('src/modules/movie/composables/useMovieRequests', () => ({
  useMovieRequests: () => ({ begin: () => () => true }),
}));
vi.mock('src/core/services/DiscordService', () => ({ default: mocks }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showError: vi.fn(), showSuccess: vi.fn() }));
const wrappers: VueWrapper[] = [];
function create() {
  const wrapper = mount(MovieContextMenuImage, {
    global: {
      stubs: {
        BaseConfirmDialog: {
          name: 'BaseConfirmDialog',
          template: '<div />',
          emits: ['ok'],
          setup: () => ({ show: mocks.show }),
        },
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = reactive({ user: { id: 'owner', isLoged: true }, isAdmin: true });
});
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

test('groups the existing buttons with wrapping, 12px gaps and 44px targets', () => {
  const wrapper = create();
  expect(
    wrapper.findAll('.mm-discord-action-buttons > button').map((button) => button.text()),
  ).toEqual(['Enviar mensagem', 'Atualizar mensagem']);
  const source = parse(
    readFileSync(resolve('src/modules/movie/components/MovieContextMenuImage.vue'), 'utf8'),
  ).descriptor;
  const css = source.styles[0]!.content;
  expect(css).toMatch(
    /\.mm-discord-action-buttons\s*\{[^}]*display: flex;[^}]*flex-wrap: wrap;[^}]*gap: 0\.75rem;[^}]*padding-top: 0\.75rem;/,
  );
  expect(css).toContain('min-height: 44px');
  expect(css).toContain('max-width: 100%');
  expect(css).toContain('white-space: normal');
  expect(compileStyle({ source: css, id: 'discord-spacing', scoped: true }).errors).toEqual([]);
});

test.each([
  ['send', 0],
  ['update', 1],
] as const)('preserves the %s confirmation before invoking Discord', async (action, index) => {
  const wrapper = create();
  await wrapper.findAll('button')[index]!.trigger('click');
  expect(mocks.show).toHaveBeenCalledWith(
    expect.objectContaining({ event: action, focus: 'cancel' }),
  );
  expect(mocks.sendDiscordMessage).not.toHaveBeenCalled();
  expect(mocks.updateDiscordMessage).not.toHaveBeenCalled();
  wrapper.findComponent({ name: 'BaseConfirmDialog' }).vm.$emit('ok', action);
  await flushPromises();
  expect(
    action === 'send' ? mocks.sendDiscordMessage : mocks.updateDiscordMessage,
  ).toHaveBeenCalledWith('film');
});

test('keeps both actions disabled while the confirmed operation is pending', async () => {
  let complete!: () => void;
  mocks.sendDiscordMessage.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      complete = resolve;
    }),
  );
  const wrapper = create();
  await wrapper.findAll('button')[0]!.trigger('click');
  wrapper.findComponent({ name: 'BaseConfirmDialog' }).vm.$emit('ok', 'send');
  await flushPromises();
  expect(
    wrapper.findAll('button').every((button) => button.attributes('disabled') !== undefined),
  ).toBe(true);
  complete();
  await flushPromises();
  expect(
    wrapper.findAll('button').every((button) => button.attributes('disabled') === undefined),
  ).toBe(true);
});

test('does not open confirmation for a non-administrator', async () => {
  mocks.user.isAdmin = false;
  const wrapper = create();
  await wrapper.findAll('button')[0]!.trigger('click');
  expect(mocks.show).not.toHaveBeenCalled();
});
