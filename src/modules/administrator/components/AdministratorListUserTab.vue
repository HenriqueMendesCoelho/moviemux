<template>
  <section class="mm-form" :aria-busy="busy">
    <h2>{{ t('account.allUsers') }}</h2>
    <div class="mm-actions">
      <label class="mm-field"
        >{{ t('account.filter')
        }}<input
          v-model.trim="filter"
          type="search"
          :placeholder="t('account.nameOrEmail')" /></label
      ><button class="mm-btn" :disabled="busy" @click="load">{{ t('account.refresh') }}</button>
    </div>
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <div class="mm-table-wrap">
      <table class="mm-table">
        <caption class="mm-sr-only">
          {{
            t('account.registeredUsers')
          }}
        </caption>
        <thead>
          <tr>
            <th>{{ t('account.person') }}</th>
            <th>{{ t('account.roles') }}</th>
            <th>{{ t('account.activity') }}</th>
            <th>{{ t('account.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in pagedRows" :key="user.id">
            <td class="mm-user-identity">
              <strong>{{ user.name }}</strong
              ><span>{{ user.email }}</span>
            </td>
            <td :data-label="t('account.roles')">{{ user.roles.join(', ') }}</td>
            <td>
              <BaseDisclosure class="mm-user-dates">
                <template #summary>{{ t('account.viewDates') }}</template>
                <dl>
                  <dt>{{ t('account.registration') }}</dt>
                  <dd>{{ formatDate(user.created_at) }}</dd>
                  <dt>{{ t('account.updated') }}</dt>
                  <dd>{{ formatDate(user.updated_at) }}</dd>
                  <dt>{{ t('account.lastLogin') }}</dt>
                  <dd>{{ formatDate(user.statistics?.last_login_at) }}</dd>
                </dl>
              </BaseDisclosure>
            </td>
            <td class="mm-user-row-actions">
              <div class="mm-actions">
                <button class="mm-btn" @click="copy(user.email)">
                  {{ t('account.copyEmail') }}</button
                ><button
                  class="mm-btn mm-btn-danger"
                  :disabled="busy || user.id === store.user.id"
                  @click="remove(user)"
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
        t(
          'account.pageSummary',
          { page, pages: pageCount, count: visibleUsers.length },
          visibleUsers.length,
        )
      }}</span>
      <button class="mm-btn" :disabled="page >= pageCount" @click="page++">
        {{ t('account.next') }}
      </button>
    </nav>
    <p v-if="!busy && !visibleUsers.length" class="mm-muted">{{ t('account.noUsers') }}</p>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
import { computed, onMounted, ref, watch } from 'vue';
import BaseDisclosure from 'src/core/components/BaseDisclosure.vue';
import type User from 'src/core/domain/user/User';
import UserService from 'src/core/services/UserService';
import { useUserStore } from 'src/core/stores/UserStore';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const users = ref<User[]>([]);
const busy = ref(false);
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
const filter = ref('');
const store = useUserStore();
const visibleUsers = computed(() =>
  users.value.filter((user) =>
    `${user.name} ${user.email}`.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase()),
  ),
);
const page = ref(1);
const pageSize = 20;
const pageCount = computed(() => Math.max(1, Math.ceil(visibleUsers.value.length / pageSize)));
const pagedRows = computed(() =>
  visibleUsers.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
watch(pageCount, (count) => {
  page.value = Math.min(page.value, count);
});
watch(filter, () => {
  page.value = 1;
});
onMounted(load);
function formatDate(value?: Date | string) {
  return value ? new Date(value).toLocaleString(locale.value) : t('account.notRecorded');
}
async function load() {
  if (busy.value) return;
  busy.value = true;
  errorMessage.value = () => '';
  try {
    users.value = await UserService.listUsersAdm();
  } catch {
    errorMessage.value = () => t('account.usersLoadFailed');
  } finally {
    busy.value = false;
  }
}
async function copy(email: string) {
  try {
    await navigator.clipboard.writeText(email);
    showSuccess(() => t('account.emailCopied'));
  } catch {
    errorMessage.value = () => t('account.copyEmailFailed');
  }
}
async function remove(user: User) {
  if (
    busy.value ||
    user.id === store.user.id ||
    !window.confirm(t('account.deleteUserConfirm', { name: user.name, email: user.email }))
  )
    return;
  busy.value = true;
  errorMessage.value = () => '';
  try {
    await UserService.deleteUser(user.id);
    users.value = users.value.filter((item) => item.id !== user.id);
    showSuccess(() => t('account.userDeleted'));
  } catch {
    errorMessage.value = () => t('account.userDeleteFailed');
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.mm-table-wrap {
  max-height: 36rem;
  overflow: auto;
}
.mm-user-identity {
  min-width: 0;
}
.mm-user-identity strong,
.mm-user-identity span {
  display: block;
  overflow-wrap: anywhere;
}
.mm-user-identity span {
  color: var(--mm-muted);
  margin-top: 5px;
}
.mm-user-dates :deep(.mm-disclosure-trigger) {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--mm-link);
  white-space: nowrap;
}
.mm-user-dates dl {
  font-size: 12px;
  margin: 0 0 8px;
}
.mm-user-dates dt {
  color: var(--mm-muted);
  margin-top: 8px;
}
.mm-user-dates dd {
  margin: 3px 0;
}
.mm-user-row-actions .mm-btn {
  font-size: 12px;
  min-height: 44px;
  padding: 8px 10px;
}
@media (max-width: 700px) {
  .mm-table-wrap {
    max-height: none;
    overflow: visible;
  }
  .mm-table thead {
    display: none;
  }
  .mm-table,
  .mm-table tbody {
    display: block;
  }
  .mm-table tr {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    padding: 14px 0;
    border-bottom: 1px solid var(--mm-border);
  }
  .mm-table td {
    display: block;
    padding: 6px 0;
    border: 0;
  }
  .mm-table td[data-label]::before {
    content: attr(data-label) ': ';
    color: var(--mm-muted);
  }
}
.mm-pagination {
  flex-wrap: wrap;
}
</style>
