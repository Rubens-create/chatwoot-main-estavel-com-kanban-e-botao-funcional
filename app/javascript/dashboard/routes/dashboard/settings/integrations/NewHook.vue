<!-- eslint-disable vue/v-slot-style -->
<script>
import { mapGetters } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useIntegrationHook } from 'dashboard/composables/useIntegrationHook';
import { FormKit } from '@formkit/vue';
import { useBranding } from 'shared/composables/useBranding';

import NextButton from 'dashboard/components-next/button/Button.vue';

export default {
  components: {
    FormKit,
    NextButton,
  },
  props: {
    integrationId: {
      type: String,
      required: true,
    },
  },
  emits: ['close'],
  setup(props) {
    const { integration, isHookTypeInbox } = useIntegrationHook(
      props.integrationId
    );
    const { replaceInstallationName } = useBranding();

    return { integration, isHookTypeInbox, replaceInstallationName };
  },
  data() {
    return {
      endPoint: '',
      alertMessage: '',
      values: {},
      isFetchingModels: false,
      availableModels: [],
    };
  },
  computed: {
    ...mapGetters({
      uiFlags: 'integrations/getUIFlags',
      dialogFlowEnabledInboxes: 'inboxes/dialogFlowEnabledInboxes',
    }),
    inboxes() {
      return this.dialogFlowEnabledInboxes
        .filter(inbox => {
          if (!this.isIntegrationDialogflow) {
            return true;
          }
          return !this.connectedDialogflowInboxIds.includes(inbox.id);
        })
        .map(inbox => ({ label: inbox.name, value: inbox.id }));
    },

    connectedDialogflowInboxIds() {
      if (!this.isIntegrationDialogflow) {
        return [];
      }
      return this.integration.hooks.map(hook => hook.inbox?.id);
    },
    formItems() {
      return this.integration.settings_form_schema;
    },
    isIntegrationDialogflow() {
      return this.integration.id === 'dialogflow';
    },
  },
  methods: {
    onClose() {
      this.$emit('close');
    },
    buildHookPayload() {
      const hookPayload = {
        app_id: this.integration.id,
        settings: {},
      };

      hookPayload.settings = Object.keys(this.values).reduce((acc, key) => {
        if (key !== 'inbox') {
          acc[key] = this.values[key];
        }
        return acc;
      }, {});

      this.formItems.forEach(item => {
        if (item.validation?.includes('JSON')) {
          hookPayload.settings[item.name] = JSON.parse(
            hookPayload.settings[item.name]
          );
        }
      });

      if (this.isHookTypeInbox && this.values.inbox) {
        hookPayload.inbox_id = this.values.inbox;
      }

      return hookPayload;
    },
    async submitForm() {
      try {
        await this.$store.dispatch(
          'integrations/createHook',
          this.buildHookPayload()
        );
        this.alertMessage = this.$t('INTEGRATION_APPS.ADD.API.SUCCESS_MESSAGE');
        this.onClose();
      } catch (error) {
        const errorMessage = error?.response?.data?.message;
        this.alertMessage =
          errorMessage || this.$t('INTEGRATION_APPS.ADD.API.ERROR_MESSAGE');
      } finally {
        useAlert(this.alertMessage);
      }
    },
    async fetchOpenAIModels() {
      if (!this.values.api_key || !this.values.api_base_url) {
        useAlert('API Key and API Base URL are required');
        return;
      }
      this.isFetchingModels = true;
      try {
        const payload = {
          api_key: this.values.api_key,
          api_base_url: this.values.api_base_url,
        };
        const response = await window.axios.post(
          `/api/v1/accounts/${this.$store.getters.getCurrentAccountId}/integrations/openai/models`,
          payload
        );
        this.availableModels = response.data.models || [];
        if (this.availableModels.length > 0) {
          useAlert(this.$t('INTEGRATION_SETTINGS.OPEN_AI.MODELS_FETCHED') || 'Modelos listados logo abaixo. Copie e cole no campo.');
        } else {
          useAlert('Nenhum modelo encontrado.');
        }
      } catch (error) {
        useAlert(error.response?.data?.error || 'Failed to fetch models');
      } finally {
        this.isFetchingModels = false;
      }
    },
  },
};
</script>

<template>
  <div class="flex flex-col h-auto overflow-auto integration-hooks">
    <woot-modal-header
      :header-title="integration.name"
      :header-content="replaceInstallationName(integration.short_description)"
    />
    <FormKit
      v-model="values"
      type="form"
      form-class="w-full grid gap-4"
      :submit-attrs="{
        inputClass: 'hidden',
        wrapperClass: 'hidden',
      }"
      :incomplete-message="false"
      @submit="submitForm"
    >
      <FormKit v-for="item in formItems" :key="item.name" v-bind="item" />
      <FormKit
        v-if="isHookTypeInbox"
        :options="inboxes"
        type="select"
        name="inbox"
        input-class="reset-base"
        :placeholder="$t('INTEGRATION_APPS.ADD.FORM.INBOX.LABEL')"
        :label="$t('INTEGRATION_APPS.ADD.FORM.INBOX.PLACEHOLDER')"
        validation="required"
        validation-name="Inbox"
      />
      <!-- Botão Custom para Integração OpenAI (Resgatar e Exibir Modelos) -->
      <div v-if="integration.id === 'openai'" class="w-full flex flex-col gap-2 p-3 bg-n-alpha-1 border border-n-weak rounded-md">
        <NextButton
          faded
          ruby
          icon="i-lucide-download-cloud"
          :is-loading="isFetchingModels"
          label="Carregar Modelos da URL"
          @click.prevent="fetchOpenAIModels"
        />
        <div v-if="availableModels.length">
          <label class="text-n-slate-11 text-xs">Modelos disponíveis:</label>
          <div class="flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto">
            <span v-for="mod in availableModels" :key="mod" @click="values.model_name = mod" class="cursor-pointer bg-n-slate-3 hover:bg-n-slate-4 px-2 py-0.5 rounded text-xs">
              {{ mod }}
            </span>
          </div>
        </div>
      </div>
      <!-- End of OpenAI Custom UI -->

      <div class="flex flex-row justify-end w-full gap-2 px-0 py-2">
        <NextButton
          faded
          slate
          type="reset"
          :label="$t('INTEGRATION_APPS.ADD.FORM.CANCEL')"
          @click.prevent="onClose"
        />
        <NextButton
          type="submit"
          :label="$t('INTEGRATION_APPS.ADD.FORM.SUBMIT')"
          :is-loading="uiFlags.isCreatingHook"
        />
      </div>
    </FormKit>
  </div>
</template>

<style lang="css">
.formkit-outer {
  @apply mt-2;
}

.formkit-form > .formkit-wrapper > ul.formkit-messages {
  @apply hidden;
}

.formkit-form .formkit-help {
  @apply text-n-slate-10 text-sm font-normal mt-2 w-full;
}

/* equivalent of .reset-base */
.formkit-input {
  margin-bottom: 0px !important;
}

[data-invalid] .formkit-message {
  @apply text-n-ruby-9 block text-xs font-normal my-1 w-full;
}

.formkit-outer[data-type='checkbox'] .formkit-wrapper {
  @apply flex items-center gap-2 px-0.5;
}

.formkit-messages {
  @apply list-none m-0 p-0;
}

.formkit-actions {
  @apply hidden;
}
</style>
