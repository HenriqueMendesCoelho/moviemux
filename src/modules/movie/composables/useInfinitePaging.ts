import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue';
/** Automatic paging with a persistent keyboard-accessible load-more fallback. */
export function useInfinitePaging(
  target: Ref<HTMLElement | undefined>,
  enabled: Ref<boolean>,
  load: () => Promise<void>,
) {
  let observer: IntersectionObserver | undefined;
  let disposed = false;
  watch(
    [target, enabled],
    async () => {
      await nextTick();
      if (disposed || !import.meta.client || !target.value) return;
      observer?.disconnect();
      const element = target.value;
      const root = element.closest('dialog');
      const maybeLoad = () => {
        if (disposed || !enabled.value || !element.isConnected) return;
        const bounds = element.getBoundingClientRect();
        const bottom = root?.getBoundingClientRect().bottom ?? window.innerHeight;
        if (bounds.top <= bottom + 160 && bounds.bottom >= 0 && element.getClientRects().length)
          void load();
      };
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) maybeLoad();
          },
          { root, rootMargin: '160px' },
        );
        observer.observe(element);
        maybeLoad();
      }
    },
    { flush: 'post' },
  );
  onBeforeUnmount(() => {
    disposed = true;
    observer?.disconnect();
  });
}
