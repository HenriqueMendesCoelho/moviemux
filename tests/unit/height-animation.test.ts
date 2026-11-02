import { afterEach, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';
import { animateHeightChange } from '../../src/core/ui/animateHeightChange';
afterEach(() => vi.restoreAllMocks());
test('height animation changes only the containing height and respects reduced motion', async () => {
  const element = document.createElement('div');
  let height = 100;
  vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => ({ height }) as DOMRect);
  const animate = vi.fn().mockReturnValue({ finished: Promise.resolve(), cancel: vi.fn() });
  element.animate = animate;
  await animateHeightChange(element, () => {
    height = 250;
  });
  expect(animate).toHaveBeenCalledWith(
    [{ height: '100px' }, { height: '250px' }],
    expect.objectContaining({ duration: 200 }),
  );
  expect(element.style.overflow).toBe('');
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  await animateHeightChange(element, () => {
    height = 100;
  });
  expect(animate).toHaveBeenCalledTimes(1);
});
test('rapid replacement cancels the prior animation and ignores stale cleanup', async () => {
  const element = document.createElement('div');
  let height = 100;
  let finishFirst!: () => void;
  const cancel = vi.fn();
  vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => ({ height }) as DOMRect);
  element.animate = vi
    .fn()
    .mockReturnValueOnce({
      finished: new Promise<void>((resolve) => {
        finishFirst = resolve;
      }),
      cancel,
    })
    .mockReturnValueOnce({ finished: Promise.resolve(), cancel: vi.fn() });
  const first = animateHeightChange(element, () => {
    height = 300;
  });
  await nextTick();
  await animateHeightChange(element, () => {
    height = 100;
  });
  finishFirst();
  await first;
  expect(element.style.overflow).toBe('');
  expect(cancel).toHaveBeenCalledOnce();
  expect(element.animate).toHaveBeenCalledTimes(2);
});
