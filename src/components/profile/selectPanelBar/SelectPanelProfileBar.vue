<template>
  <div class="row">
    <div class="col-12">
      <div class="row">
        <div class="col-6">
          <button
            class="btn-left-bordered"
            :class="{ active: ProfileSelectBar.PanelMyData }"
            @click="
              ProfileSelectBar.PanelMyData = true;
              ProfileSelectBar.PanelSecurity = false;
            "
          >
            Meus dados
            <span
              v-if="!$q.platform.is.mobile"
              class="material-icons"
              style="transform: translateY(-3px) scale(1.3)"
            >
              badge
            </span>
          </button>
        </div>
        <div class="col-6">
          <button
            class="btn-right-bordered"
            :class="{ active: ProfileSelectBar.PanelSecurity }"
            @click="
              ProfileSelectBar.PanelMyData = false;
              ProfileSelectBar.PanelSecurity = true;
            "
          >
            Segurança
            <span
              v-if="!$q.platform.is.mobile"
              class="material-icons"
              style="transform: translateY(-3px) scale(1.3)"
            >
              lock
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';
import { useProfileStore } from '@/stores/ProfileStore';

//:class="{ active: AdministratorSelectBar.panel_access }"

export default defineComponent({
  name: 'SelectPanelProfileBar',
  computed: {
    ...mapState(useProfileStore, ['ProfileSelectBar']),
  },
});
</script>

<style lang="scss" scoped>
button {
  font-weight: 500;

  height: 4vh;

  width: 100%;

  text-transform: uppercase;

  color: var(--light-grey2);
  background-color: var(--dark-alt);
  font-weight: 400;
  box-shadow: 0 5px 30px var(--shadow);

  &:hover {
    background-color: var(--dark-alt2);
    border: solid 3px var(--dark-alt);

    color: var(--primary);
  }
}

.btn-left-bordered {
  border-top-left-radius: 15px;
  border-end-start-radius: 15px;
  border-right: 1px solid rgba(255, 255, 255, 0.2);

  @media (max-width: 768px) {
    height: 3rem;
  }
}

.btn-right-bordered {
  border-end-end-radius: 15px;
  border-start-end-radius: 15px;
  border-left: 1px solid rgba(255, 255, 255, 0.2);

  @media (max-width: 768px) {
    height: 3rem;
  }
}

.active {
  background-color: var(--dark-alt2);
  border: solid 3px var(--dark-alt);

  color: var(--primary);
}
</style>
