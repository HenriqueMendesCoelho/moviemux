<template>
  <section class="mm-form" :aria-busy="busy">
    <h2>{{ t('account.inviteTitle') }}</h2>
    <p class="mm-muted">{{ t('account.inviteIntro') }}</p>
    <div class="mm-actions">
      <button class="mm-btn mm-btn-primary" :disabled="busy" @click="createInvite">
        {{ t('account.generateInvite') }}</button
      ><button class="mm-btn" :disabled="busy" @click="loadInvites">
        {{ t('account.refresh') }}
      </button>
    </div>
    <label v-if="invite" class="mm-field"
      >{{ t('account.latestInvite')
      }}<input :value="invite" readonly @focus="($event.target as HTMLInputElement).select()"
    /></label>
    <p v-if="error" class="mm-error" role="alert">{{ error }}</p>
    <div class="mm-table-wrap">
      <table class="mm-table">
        <caption class="mm-sr-only">
          {{
            t('account.availableInvites')
          }}
        </caption>
        <thead>
          <tr>
            <th>{{ t('account.code') }}</th>
            <th>{{ t('account.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pagedRows" :key="row.code">
            <td class="mm-invite-code">{{ row.code }}</td>
            <td>
              <div class="mm-actions">
                <button class="mm-btn" :disabled="busy" @click="copy(row.code)">
                  {{ t('account.copy') }}</button
                ><button
                  class="mm-btn mm-btn-danger"
                  :disabled="busy"
                  @click="deleteInvite(row.code)"
                >
                  {{ t('account.delete') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <nav class="mm-actions mm-pagination" :aria-label="t('account.pagination')">
      <button class="mm-btn" :disabled="page <= 1" @click="page--">
        {{ t('account.previous') }}
      </button>
      <span role="status">{{
        t('account.pageSummary', { page, pages: pageCount, count: invites.length }, invites.length)
      }}</span>
      <button class="mm-btn" :disabled="page >= pageCount" @click="page++">
        {{ t('account.next') }}
      </button>
    </nav>
    <p v-if="!busy && !invites.length" class="mm-muted">{{ t('account.noInvites') }}</p>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { computed, onMounted, ref, watch } from 'vue';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const invites = ref<{ code: string }[]>([]);
const invite = ref('');
const busy = ref(false);
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
const page = ref(1);
const pageSize = 20;
const pageCount = computed(() => Math.max(1, Math.ceil(invites.value.length / pageSize)));
const pagedRows = computed(() =>
  invites.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
watch(pageCount, (count) => {
  page.value = Math.min(page.value, count);
});
onMounted(loadInvites);
async function loadInvites() {
  if (busy.value) return;
  busy.value = true;
  errorMessage.value = () => '';
  try {
    invites.value = await UserService.listUserInvites();
  } catch {
    errorMessage.value = () => t('account.invitesLoadFailed');
  } finally {
    busy.value = false;
  }
}
async function createInvite() {
  if (busy.value) return;
  busy.value = true;
  errorMessage.value = () => '';
  try {
    const result = await UserService.createUserInvite();
    invite.value = result.code;
    // Creation is already successful even if refreshing the list fails.
    if (!invites.value.some((item) => item.code === result.code))
      invites.value = [result, ...invites.value];
    showSuccess(() => t('account.inviteCreated'));
    try {
      invites.value = await UserService.listUserInvites();
    } catch {
      errorMessage.value = () => t('account.inviteRefreshFailed');
    }
  } catch {
    errorMessage.value = () => t('account.inviteCreateFailed');
  } finally {
    busy.value = false;
  }
}
async function deleteInvite(code: string) {
  if (busy.value || !window.confirm(t('account.deleteInviteConfirm'))) return;
  busy.value = true;
  errorMessage.value = () => '';
  try {
    await UserService.deleteUserInvite(code);
    invites.value = invites.value.filter((item) => item.code !== code);
    if (invite.value === code) invite.value = '';
    showSuccess(() => t('account.inviteDeleted'));
  } catch {
    errorMessage.value = () => t('account.inviteDeleteFailed');
  } finally {
    busy.value = false;
  }
}
async function copy(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    showSuccess(() => t('account.inviteCopied'));
  } catch {
    errorMessage.value = () => t('account.copyCodeFailed');
  }
}
</script>
<style scoped>
.mm-table-wrap {
  max-height: 36rem;
  overflow: auto;
}
.mm-pagination {
  flex-wrap: wrap;
}
.mm-invite-code {
  overflow-wrap: anywhere;
  max-width: 35rem;
}
</style>
