import js from '@eslint/js';
import globals from 'globals';
import vue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
export default defineConfigWithVueTs(
  { ignores: ['node_modules/**', '.nuxt/**', '.output/**', 'dist/**', 'src-pwa/**', 'src-ssr/**'] },
  js.configs.recommended, vue.configs['flat/essential'], vueTsConfigs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node, defineNuxtConfig: 'readonly', defineNuxtPlugin: 'readonly', defineNuxtRouteMiddleware: 'readonly', definePageMeta: 'readonly', navigateTo: 'readonly', useRuntimeConfig: 'readonly', useCookie: 'readonly', useRoute: 'readonly', useHead: 'readonly', useAsyncData: 'readonly', useState: 'readonly', ref: 'readonly', computed: 'readonly', watch: 'readonly', onMounted: 'readonly', onBeforeUnmount: 'readonly', useNuxtApp: 'readonly' } }, rules: { 'vue/multi-word-component-names': 'off', '@typescript-eslint/no-explicit-any': 'off' } }
);
