<script>
import { mapGetters } from 'vuex';
import { useVuelidate } from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { useAlert } from 'dashboard/composables';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useAI } from 'dashboard/composables/useAI';
import { OPEN_AI_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';

import NextButton from 'dashboard/components-next/button/Button.vue';

export default {
  components: {
    NextButton,
  },
  emits: ['close'],

  setup() {
    const { updateUISettings } = useUISettings();
    const { recordAnalytics } = useAI();
    const v$ = useVuelidate();

    return { updateUISettings, v$, recordAnalytics };
  },
  data() {
    return {
      value: '',
      apiBaseUrl: 'https://api.openai.com/v1',
      modelName: 'gpt-3.5-turbo',
      availableModels: [],
      isFetchingModels: false,
    };
  },
  mounted() {
    this.$store.dispatch('integrations/get');
    if (this.existingHook && this.existingHook.settings) {
      if (this.existingHook.settings.api_key) {
        this.value = this.existingHook.settings.api_key;
      }
      if (this.existingHook.settings.api_base_url) {
        this.apiBaseUrl = this.existingHook.settings.api_base_url;
      }
      if (this.existingHook.settings.model_name) {
        this.modelName = this.existingHook.settings.model_name;
        this.availableModels = [this.modelName]; // Garante que será exibido no dropdown provisoriamente
      }
    }
  },
  computed: {
    ...mapGetters({
      accountId: 'getCurrentAccountId',
      getIntegration: 'integrations/getIntegration',
    }),
    openAIIntegration() {
      return this.getIntegration('openai');
    },
    existingHook() {
      if (
        this.openAIIntegration &&
        this.openAIIntegration.hooks &&
        this.openAIIntegration.hooks.length > 0
      ) {
        return this.openAIIntegration.hooks[0];
      }
      return null;
    },
  },
  validations: {
    value: {
      required,
    },
    apiBaseUrl: {
      required,
    },
    modelName: {
      required,
    },
  },
  methods: {
    onClose() {
      this.$emit('close');
    },

    onDismiss() {
      useAlert(
        this.$t('INTEGRATION_SETTINGS.OPEN_AI.CTA_MODAL.DISMISS_MESSAGE')
      );
      this.updateUISettings({
        is_open_ai_cta_modal_dismissed: true,
      });
      this.onClose();
    },

    async fetchModels() {
      if (!this.value || !this.apiBaseUrl) {
        useAlert('API Key and API Base URL are required');
        return;
      }
      this.isFetchingModels = true;
      try {
        const response = await window.axios.post(
          `/api/v1/accounts/${this.accountId}/integrations/openai/models`,
          {
            api_key: this.value,
            api_base_url: this.apiBaseUrl,
          }
        );
        this.availableModels = response.data.models || [];
        if (this.availableModels.length > 0) {
          if (!this.availableModels.includes(this.modelName)) {
            this.modelName = this.availableModels[0];
          }
        }
      } catch (error) {
        useAlert(error.response?.data?.error || 'Failed to fetch models');
      } finally {
        this.isFetchingModels = false;
      }
    },

    async finishOpenAI() {
      const payload = {
        app_id: 'openai',
        settings: {
          api_key: this.value,
          api_base_url: this.apiBaseUrl,
          model_name: this.modelName,
        },
      };
      // Se a conta já tiver um hook para openai, deletamos primeiro para não bater na validação de unicidade.
      try {
        if (this.existingHook) {
          await this.$store.dispatch('integrations/deleteHook', {
            appId: 'openai',
            hookId: this.existingHook.id,
          });
        }
        await this.$store.dispatch('integrations/createHook', payload);
        this.alertMessage = this.$t(
          'INTEGRATION_SETTINGS.OPEN_AI.CTA_MODAL.SUCCESS_MESSAGE'
        );
        this.recordAnalytics(
          OPEN_AI_EVENTS.ADDED_AI_INTEGRATION_VIA_CTA_BUTTON
        );
        this.onClose();
      } catch (error) {
        const errorMessage = error?.response?.data?.message;
        this.alertMessage =
          errorMessage || this.$t('INTEGRATION_APPS.ADD.API.ERROR_MESSAGE');
      } finally {
        useAlert(this.alertMessage);
      }
    },
    openOpenAIDoc() {
      window.open('https://www.chatwoot.com/blog/v2-17', '_blank');
    },
  },
};
</script>

<template>
  <div class="flex-1 min-w-0 px-0">
    <woot-modal-header
      :header-title="$t('INTEGRATION_SETTINGS.OPEN_AI.CTA_MODAL.TITLE')"
      :header-content="$t('INTEGRATION_SETTINGS.OPEN_AI.CTA_MODAL.DESC')"
    />
    <form
      class="flex flex-col flex-wrap modal-content"
      @submit.prevent="finishOpenAI"
    >
      <div class="w-full mt-2">
        <label class="block text-sm font-medium mb-1">API Key</label>
        <woot-input
          v-model="value"
          type="text"
          :class="{ error: v$.value.$error }"
          :placeholder="
            $t('INTEGRATION_SETTINGS.OPEN_AI.CTA_MODAL.KEY_PLACEHOLDER')
          "
          @blur="v$.value.$touch"
        />
      </div>

      <div class="w-full mt-2">
        <label class="block text-sm font-medium mb-1">API Base URL</label>
        <div class="flex gap-2">
          <woot-input
            v-model="apiBaseUrl"
            type="text"
            class="flex-1"
            :class="{ error: v$.apiBaseUrl.$error }"
            placeholder="https://api.openai.com/v1"
            @blur="v$.apiBaseUrl.$touch"
          />
          <NextButton
            type="button"
            :disabled="!value || !apiBaseUrl || isFetchingModels"
            :label="isFetchingModels ? 'Loading...' : 'Load Models'"
            class="!mt-1"
            @click.prevent="fetchModels"
          />
        </div>
      </div>

      <div class="w-full mt-2">
        <label class="block text-sm font-medium mb-1">Model Name</label>
        <select
          v-if="availableModels.length > 0"
          v-model="modelName"
          class="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option
            v-for="model in availableModels"
            :key="model"
            :value="model"
          >
            {{ model }}
          </option>
        </select>
        <woot-input
          v-else
          v-model="modelName"
          type="text"
          :class="{ error: v$.modelName.$error }"
          placeholder="gpt-3.5-turbo"
          @blur="v$.modelName.$touch"
        />
      </div>

      <div class="flex flex-row justify-between w-full gap-2 px-0 py-2 mt-4">
        <NextButton
          ghost
          type="button"
          class="!px-3"
          :label="
            $t('INTEGRATION_SETTINGS.OPEN_AI.CTA_MODAL.BUTTONS.NEED_HELP')
          "
          @click.prevent="openOpenAIDoc"
        />
        <div class="flex items-center gap-1">
          <NextButton
            faded
            slate
            type="reset"
            :label="
              $t('INTEGRATION_SETTINGS.OPEN_AI.CTA_MODAL.BUTTONS.DISMISS')
            "
            @click.prevent="onDismiss"
          />
          <NextButton
            type="submit"
            :disabled="
              v$.value.$invalid ||
              v$.apiBaseUrl.$invalid ||
              v$.modelName.$invalid
            "
            :label="
              $t('INTEGRATION_SETTINGS.OPEN_AI.CTA_MODAL.BUTTONS.FINISH')
            "
          />
        </div>
      </div>
    </form>
  </div>
</template>
