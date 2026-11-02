import { nextTick } from 'vue';
const running = new WeakMap<
  HTMLElement,
  { generation: number; animation?: Animation; overflow: string }
>();
/** Keep existing card geometry; animate only the containing block's changed height. */
export async function animateHeightChange(element: HTMLElement | undefined, change: () => void) {
  if (!element) {
    change();
    return;
  }
  const previous = running.get(element);
  const start = element.getBoundingClientRect().height;
  previous?.animation?.cancel();
  if (previous) element.style.overflow = previous.overflow;
  const state = {
    generation: (previous?.generation || 0) + 1,
    overflow: element.style.overflow,
    animation: undefined as Animation | undefined,
  };
  running.set(element, state);
  change();
  await nextTick();
  if (running.get(element) !== state) return;
  const end = element.getBoundingClientRect().height;
  if (
    !element.animate ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    start === end
  )
    return;
  const overflow = element.style.overflow;
  state.overflow = overflow;
  element.style.overflow = 'hidden';
  state.animation = element.animate([{ height: `${start}px` }, { height: `${end}px` }], {
    duration: 200,
    easing: 'cubic-bezier(.2,.7,.2,1)',
  });
  try {
    await state.animation.finished;
  } catch {
    /* A newer interaction replaces this animation. */
  }
  if (running.get(element) === state) element.style.overflow = overflow;
}
