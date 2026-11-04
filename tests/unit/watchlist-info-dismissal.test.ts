import { afterEach, expect, test, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import Info from 'src/modules/movie-watchlist/components/MovieWatchlistTooltipInfo.vue';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';

const watchlist: WatchlistType = {
  id: 'test-list',
  name: 'My list',
  shareable: false,
  user: { id: 'owner', name: 'Owner' },
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-02'),
  movies_wishlists: [],
};
const wrappers: VueWrapper[] = [];
function setup() {
  const wrapper = mount(Info, { attachTo: document.body, props: { watchlist } });
  wrappers.push(wrapper);
  return wrapper;
}
async function setOpen(wrapper: VueWrapper, open = true) {
  const details = wrapper.get<HTMLDetailsElement>('details');
  details.element.open = open;
  // Native activation/toggle timing is also checked in browser acceptance.
  await details.trigger('toggle');
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

test.each(['mouse', 'touch', 'pen'])(
  'outside %s pointer closes without cancelling its normal action',
  async (pointerType) => {
    const wrapper = setup();
    const outside = document.createElement('button');
    document.body.append(outside);
    await setOpen(wrapper);
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType });
    outside.dispatchEvent(event);
    expect(wrapper.get<HTMLDetailsElement>('details').element.open).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    outside.focus();
    expect(document.activeElement).toBe(outside);
  },
);

test('inside pointer interaction preserves the native information panel and metadata', async () => {
  const wrapper = setup();
  await setOpen(wrapper);
  const inside = wrapper.get('dd');
  await inside.trigger('pointerdown');
  await inside.trigger('click');
  expect(wrapper.get<HTMLDetailsElement>('details').element.open).toBe(true);
  expect(wrapper.get('dl').text()).toContain('Owner');
  expect(wrapper.get('dl').text()).toContain('0/100');
  expect(wrapper.get('summary').text()).toBe('Sobre esta lista');
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});

test('Escape closes and restores focus when used inside the disclosure', async () => {
  const wrapper = setup();
  await setOpen(wrapper);
  const inside = document.createElement('button');
  wrapper.get('dd').element.append(inside);
  inside.focus();
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  inside.dispatchEvent(event);
  expect(wrapper.get<HTMLDetailsElement>('details').element.open).toBe(false);
  expect(document.activeElement).toBe(wrapper.get('summary').element);
  expect(event.defaultPrevented).toBe(true);
});

test('keyboard focus leaving dismisses without stealing focus, and unrelated Escape stays untouched', async () => {
  const wrapper = setup();
  const outside = document.createElement('button');
  document.body.append(outside);
  await setOpen(wrapper);
  wrapper.get<HTMLElement>('summary').element.focus();
  outside.focus();
  expect(wrapper.get<HTMLDetailsElement>('details').element.open).toBe(false);
  expect(document.activeElement).toBe(outside);
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  outside.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(document.activeElement).toBe(outside);
});

test('Escape with focus already elsewhere closes without moving focus to a stale trigger', async () => {
  const wrapper = setup();
  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  await setOpen(wrapper);
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  outside.dispatchEvent(event);
  expect(wrapper.get<HTMLDetailsElement>('details').element.open).toBe(false);
  expect(event.defaultPrevented).toBe(false);
  expect(document.activeElement).toBe(outside);
});

test('registers once while open, removes on native close, and cleans up after repeated opening/unmount', async () => {
  const add = vi.spyOn(document, 'addEventListener');
  const remove = vi.spyOn(document, 'removeEventListener');
  const wrapper = setup();
  for (const type of ['pointerdown', 'keydown', 'focusin']) {
    expect(add.mock.calls.filter(([name]) => name === type)).toHaveLength(0);
  }
  await setOpen(wrapper);
  await setOpen(wrapper);
  for (const type of ['pointerdown', 'keydown', 'focusin']) {
    expect(add.mock.calls.filter(([name]) => name === type)).toHaveLength(1);
  }
  await setOpen(wrapper, false);
  await setOpen(wrapper);
  wrapper.unmount();
  for (const type of ['pointerdown', 'keydown', 'focusin']) {
    const added = add.mock.calls.filter(([name]) => name === type);
    expect(added).toHaveLength(2);
    for (const args of added) expect(remove.mock.calls).toContainEqual(args);
  }
});
