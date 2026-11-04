import { afterEach, expect, test, vi } from 'vitest';
import { config, mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import AppFeedback from '../../src/core/layout/AppFeedback.vue';
import { notifyAction, showError, showSuccess } from '../../src/core/utils/NotificationUtils';

vi.stubGlobal('useNuxtApp', () => ({ $pwa: undefined }));
vi.stubGlobal('ref', ref);
vi.stubGlobal('onMounted', onMounted);
vi.stubGlobal('onBeforeUnmount', onBeforeUnmount);
afterEach(() => vi.useRealTimers());

test('open notification message and action follow locale without replacing toast or callback', async () => {
  vi.useFakeTimers();
  const i18n = createI18n({
    legacy: false,
    locale: 'pt-BR',
    messages: {
      'pt-BR': {
        saved: 'Salvo: {title}',
        open: 'Abrir',
        failure: 'Falhou',
        components: { closeNotification: 'Fechar' },
      },
      en: {
        saved: 'Saved: {title}',
        open: 'Open',
        failure: 'Failed',
        components: { closeNotification: 'Close' },
      },
    },
  });
  config.global.plugins = [i18n];
  const wrapper = mount(AppFeedback);
  const handler = vi.fn();
  const title = 'Cidade de Deus';
  notifyAction(
    () => i18n.global.t('saved', { title }),
    () => i18n.global.t('open'),
    handler,
  );
  showError('failure');
  showSuccess('Literal notice');
  await nextTick();
  expect(wrapper.text()).toContain('Salvo: Cidade de Deus');
  const notice = wrapper.findAll('article')[0]!.element;
  i18n.global.locale.value = 'en';
  await nextTick();
  expect(wrapper.findAll('article')[0]!.element).toBe(notice);
  expect(wrapper.text()).toContain('Saved: Cidade de Deus');
  expect(wrapper.text()).toContain('Failed');
  expect(wrapper.text()).toContain('Literal notice');
  await wrapper.findAll('article')[0]!.find('button').trigger('click');
  expect(handler).toHaveBeenCalledOnce();
  expect(wrapper.findAll('article')).toHaveLength(2);
  wrapper.unmount();
  vi.runAllTimers();
  expect(handler).toHaveBeenCalledOnce();
});
