<template>
  <div class="row justify-center full-height" style="overflow-y: hidden">
    <h2 class="text-h3 title">Login</h2>
    <BaseHorizontalSeparator />
    <div class="col-10 justify-center">
      <q-input
        ref="inputEmailRef"
        name="username"
        label="E-mail"
        v-model="email"
        color="kb-primary"
        bg-color="grey-mid"
        dark
        :type="'email'"
        :rules="[(val) => !!val]"
      >
        <template v-slot:append>
          <q-icon name="mail" />
        </template>
      </q-input>
    </div>
    <div class="col-10 justify-center q-mt-md">
      <BasePasswordInput
        ref="inputPasswordRef"
        @keyup.enter="login()"
        v-model="password"
        required
        :error-text-required="false"
      />
      <button class="btn-underline q-mt-md" @click="changeTab('forgot')">
        Esqueceu sua senha ?
      </button>
    </div>
    <div class="col-10 q-mt-xl">
      <q-btn
        ref="btnLoginRef"
        class="btn-login"
        label="entrar"
        @click="login()"
        color="kb-primary"
        text-color="black"
        style="width: 100%"
      />
    </div>
    <div class="col-10 q-mt-xl">
      <div class="g-signin2" data-onsuccess="onSignIn"></div>
    </div>
    <div class="col-12 row justify-center q-mt-md">
      <div class="row" v-if="props.createAccount">
        <p style="color: white">
          Não tem conta ?
          <button class="btn-underline" @click="changeTab('create')">Criar agora</button>
        </p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { QInput } from 'quasar';

import { useUserStore } from 'src/core/stores/UserStore';

import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import BasePasswordInput from 'src/core/components/BasePasswordInput.vue';
import { showError } from 'src/core/utils/NotificationUtils';

type btnFocusRefType = {
  $el: {
    focus: () => void;
  };
};

interface Props {
  createAccount: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  createAccount: true,
});

const emit = defineEmits<{
  (e: 'changeTab', value: string): void;
  (e: 'loading', value: boolean): void;
}>();

const route = useRoute();
const router = useRouter();

const inputEmailRef = ref<InstanceType<typeof QInput>>();
const inputPasswordRef = ref<InstanceType<typeof BasePasswordInput>>();
const btnLoginRef = ref<btnFocusRefType>();

const userStore = useUserStore();

const email = ref('');
const password = ref('');

onMounted(() => {
  btnLoginRef.value?.$el.focus();
});

function changeTab(tab: string) {
  emit('changeTab', tab);
}
async function login() {
  if (await hasErrors()) {
    return;
  }

  try {
    emit('loading', true);
    await userStore.login({ email: email.value, password: password.value });
    if (route.name === 'login') {
      if (route.query.from) {
        await router.push(route.query.from.toString());
        return;
      }

      await router.push('/home');
    } else {
      window.location.reload();
    }
  } catch {
    showError('Error ao fazer login, tente novamente mais tarde!');
  } finally {
    emit('loading', false);
  }
}
async function hasErrors() {
  let hasErrors = false;
  if (inputEmailRef.value) {
    await inputEmailRef.value.validate();
    hasErrors = inputEmailRef.value.hasError;
  }
  if (inputPasswordRef.value) {
    hasErrors = await inputPasswordRef.value.hasErrors();
  }
  return hasErrors;
}
</script>

<style lang="scss" scoped>
.title {
  color: var(--primary);
}
.btn-underline {
  color: var(--primary);
  text-decoration: underline;
}

.btn-login {
  font-weight: 600;
  &:hover {
    background-color: var(--light-blue);
    box-shadow: 0 10px 30px -20px var(--light-blue);
    transition: 0.2s ease-out;
  }
}
</style>
