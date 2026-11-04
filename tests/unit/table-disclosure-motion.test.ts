import { afterEach, expect, test } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, compileStyle } from 'vue/compiler-sfc';
import BaseDisclosure from 'src/core/components/BaseDisclosure.vue';
const wrappers: VueWrapper[] = [];
function create() {
  const wrapper = mount(BaseDisclosure, {
    attachTo: document.body,
    slots: { summary: 'Ver datas', default: '<a href="#dates">Cadastro de exemplo</a>' },
  });
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

test('links a native keyboard button to unique closed, inert content', () => {
  const siblings = mount({
    components: { BaseDisclosure },
    template:
      '<div><BaseDisclosure><template #summary>Primeira</template>Datas</BaseDisclosure><BaseDisclosure><template #summary>Segunda</template>Datas</BaseDisclosure></div>',
  });
  wrappers.push(siblings);
  const [first, second] = siblings.findAllComponents(BaseDisclosure);
  const trigger = first!.get('button');
  expect(trigger.attributes('type')).toBe('button');
  expect(trigger.attributes('aria-expanded')).toBe('false');
  expect(trigger.attributes('aria-controls')).toBe(
    first!.get('.mm-disclosure-panel').attributes('id'),
  );
  expect(first!.get('.mm-disclosure-panel').attributes('inert')).toBeDefined();
  expect(first!.get('.mm-disclosure-panel').attributes('aria-hidden')).toBe('true');
  expect(trigger.attributes('aria-controls')).not.toBe(
    second!.get('button').attributes('aria-controls'),
  );
});

test('rapid toggles settle at the most recent state without timers or detached content', async () => {
  const wrapper = create();
  const trigger = wrapper.get('button');
  for (let index = 0; index < 9; index++) await trigger.trigger('click');
  expect(trigger.attributes('aria-expanded')).toBe('true');
  expect(wrapper.get('.mm-disclosure-panel').attributes('inert')).toBeUndefined();
  expect(wrapper.get('.mm-disclosure-panel').attributes('aria-hidden')).toBe('false');
  await trigger.trigger('click');
  expect(trigger.attributes('aria-expanded')).toBe('false');
  expect(wrapper.get('.mm-disclosure-panel').attributes('inert')).toBeDefined();
});

test('Escape from within expanded content closes it and restores trigger focus', async () => {
  const wrapper = create();
  await wrapper.get('button').trigger('click');
  wrapper.get('a').element.focus();
  await wrapper.get('a').trigger('keydown', { key: 'Escape' });
  expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(wrapper.get('button').element);
});

test('keeps disclosures independent', async () => {
  const first = create(),
    second = create();
  await first.get('button').trigger('click');
  expect(second.get('button').attributes('aria-expanded')).toBe('false');
});

test('declares both-way intrinsic height motion and honors reduced motion', () => {
  const source = parse(
    readFileSync(resolve('src/core/components/BaseDisclosure.vue'), 'utf8'),
  ).descriptor;
  const css = source.styles[0]!.content;
  expect(css).toContain('grid-template-rows: 0fr');
  expect(css).toContain('grid-template-rows: 1fr');
  expect(css).toContain('min-height: 0');
  expect(css).toContain('overflow: hidden');
  expect(css).toContain('min-height: 44px');
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none/);
  expect(compileStyle({ source: css, id: 'disclosure', scoped: true }).errors).toEqual([]);
});

test.each([
  'src/modules/administrator/components/AdministratorListUserTab.vue',
  'src/modules/movie/components/MovieTableNotes.vue',
])('uses the shared disclosure for dates in %s', (path) => {
  const source = parse(readFileSync(resolve(path), 'utf8')).descriptor;
  expect(source.template?.content).toMatch(/<BaseDisclosure class="mm-(user|review)-dates"/);
  expect(source.template?.content).not.toMatch(/<details class="mm-(user|review)-dates"/);
});
