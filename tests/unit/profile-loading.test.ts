import { flushPromises, shallowMount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import PanelProfile from '../../src/modules/profile/components/PanelProfile.vue';
import User from '../../src/core/domain/user/User';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), updateUserProfile: vi.fn() }));
vi.mock('src/core/services/UserService', () => ({ default: mocks }));
vi.mock('src/core/utils/NotificationUtils', () => ({ showSuccess: vi.fn() }));
function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { resolve, reject, promise };
}
test('profile initial skeleton gives way to error/retry and never blanks loaded content on refresh', async () => {
  const first = pending<User>();
  mocks.getUser.mockReturnValue(first.promise);
  const wrapper = shallowMount(PanelProfile);
  expect(wrapper.findComponent({ name: 'ProfileLoadingState' }).exists()).toBe(true);
  expect(wrapper.findComponent({ name: 'BaseUserInfoPanel' }).exists()).toBe(false);
  first.reject(new Error('offline'));
  await flushPromises();
  expect(wrapper.findComponent({ name: 'ProfileLoadingState' }).exists()).toBe(false);
  expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  const retry = pending<User>();
  mocks.getUser.mockReturnValue(retry.promise);
  await wrapper.findAll('button')[1]!.trigger('click');
  expect(wrapper.findComponent({ name: 'ProfileLoadingState' }).exists()).toBe(true);
  retry.resolve(new User());
  await flushPromises();
  expect(wrapper.findComponent({ name: 'BaseUserInfoPanel' }).exists()).toBe(true);
  expect(wrapper.findComponent({ name: 'ProfileLoadingState' }).exists()).toBe(false);
  const refresh = pending<User>();
  mocks.getUser.mockReturnValue(refresh.promise);
  await wrapper.findAll('button')[1]!.trigger('click');
  expect(wrapper.findComponent({ name: 'BaseUserInfoPanel' }).exists()).toBe(true);
  expect(wrapper.findComponent({ name: 'ProfileLoadingState' }).exists()).toBe(false);
  refresh.resolve(new User());
  await flushPromises();
  wrapper.unmount();
});
