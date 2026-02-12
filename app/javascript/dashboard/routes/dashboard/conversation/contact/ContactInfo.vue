<script>
import { mapGetters } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { dynamicTime } from 'shared/helpers/timeHelper';
import { useAdmin } from 'dashboard/composables/useAdmin';
import ContactInfoRow from './ContactInfoRow.vue';
import Avatar from 'next/avatar/Avatar.vue';
import SocialIcons from './SocialIcons.vue';
import EditContact from './EditContact.vue';
import ContactMergeModal from 'dashboard/modules/contact/ContactMergeModal.vue';
import ComposeConversation from 'dashboard/components-next/NewConversation/ComposeConversation.vue';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import NextButton from 'dashboard/components-next/button/Button.vue';
import VoiceCallButton from 'dashboard/components-next/Contacts/VoiceCallButton.vue';
import Switch from 'dashboard/components-next/switch/Switch.vue';

import {
  isAConversationRoute,
  isAInboxViewRoute,
  getConversationDashboardRoute,
} from '../../../../helper/routeHelpers';
import { emitter } from 'shared/helpers/mitt';

export default {
  components: {
    NextButton,
    ContactInfoRow,
    EditContact,
    Avatar,
    ComposeConversation,
    SocialIcons,
    ContactMergeModal,
    VoiceCallButton,
    Switch,
  },
  props: {
    contact: {
      type: Object,
      default: () => ({}),
    },
    showAvatar: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['panelClose'],
  setup() {
    const { isAdmin } = useAdmin();
    return {
      isAdmin,
    };
  },
  data() {
    return {
      showEditModal: false,
      showMergeModal: false,
      showDeleteModal: false,
      isLoading: false,
      localBotActive: true,
    };
  },
  computed: {
    ...mapGetters({ uiFlags: 'contacts/getUIFlags' }),
    contactLabels() {
      return this.$store.getters['contactLabels/getContactLabels'](this.contact.id) || [];
    },
    isBotEnabled() {
      const isBotActive = this.contact.custom_attributes?.bot_ativo;
      // Default to true if undefined or null
      return isBotActive !== false;
    },
    contactProfileLink() {
      return `/app/accounts/${this.$route.params.accountId}/contacts/${this.contact.id}`;
    },
    additionalAttributes() {
      return this.contact.additional_attributes || {};
    },
    location() {
      const {
        country = '',
        city = '',
        country_code: countryCode,
      } = this.additionalAttributes;
      const cityAndCountry = [city, country].filter(item => !!item).join(', ');

      if (!cityAndCountry) {
        return '';
      }
      return this.findCountryFlag(countryCode, cityAndCountry);
    },
    socialProfiles() {
      const {
        social_profiles: socialProfiles,
        screen_name: twitterScreenName,
        social_telegram_user_name: telegramUsername,
      } = this.additionalAttributes;
      return {
        twitter: twitterScreenName,
        telegram: telegramUsername,
        ...(socialProfiles || {}),
      };
    },
    // Delete Modal
    confirmDeleteMessage() {
      return ` ${this.contact.name}?`;
    },
  },
  watch: {
    contact: {
      handler(newContact) {
        // Initialize local state from contact prop
        const isBotActive = newContact.custom_attributes?.bot_ativo;
        // Default to true if undefined or null
        this.localBotActive = isBotActive !== false;
      },
      immediate: true,
      deep: true,
    },
    'contact.id': {
      handler(id) {
        if (id) {
          this.$store.dispatch('contacts/fetchContactableInbox', id);
          this.$store.dispatch('contactLabels/get', id);
        }
      },
      immediate: true,
    },
  },
  methods: {
    dynamicTime,
    toggleEditModal() {
      this.showEditModal = !this.showEditModal;
    },
    openComposeConversationModal(toggleFn) {
      toggleFn();
      // Flag to prevent triggering drag n drop,
      // When compose modal is active
      emitter.emit(BUS_EVENTS.NEW_CONVERSATION_MODAL, true);
    },
    closeComposeConversationModal() {
      // Flag to enable drag n drop,
      // When compose modal is closed
      emitter.emit(BUS_EVENTS.NEW_CONVERSATION_MODAL, false);
    },
    toggleDeleteModal() {
      this.showDeleteModal = !this.showDeleteModal;
    },
    confirmDeletion() {
      this.deleteContact(this.contact);
      this.closeDelete();
    },
    closeDelete() {
      this.showDeleteModal = false;
      this.showEditModal = false;
    },
    findCountryFlag(countryCode, cityAndCountry) {
      try {
        if (!countryCode) {
          return `${cityAndCountry} 🌎`;
        }

        const code = countryCode?.toLowerCase();
        return `${cityAndCountry} <span class="fi fi-${code} size-3.5"></span>`;
      } catch (error) {
        return '';
      }
    },
    async deleteContact({ id }) {
      try {
        await this.$store.dispatch('contacts/delete', id);
        this.$emit('panelClose');
        useAlert(this.$t('DELETE_CONTACT.API.SUCCESS_MESSAGE'));

        if (isAConversationRoute(this.$route.name)) {
          this.$router.push({
            name: getConversationDashboardRoute(this.$route.name),
          });
        } else if (isAInboxViewRoute(this.$route.name)) {
          this.$router.push({
            name: 'inbox_view',
          });
        } else if (this.$route.name !== 'contacts_dashboard') {
          this.$router.push({
            name: 'contacts_dashboard',
          });
        }
      } catch (error) {
        useAlert(
          error.message
            ? error.message
            : this.$t('DELETE_CONTACT.API.ERROR_MESSAGE')
        );
      }
    },
    closeMergeModal() {
      this.showMergeModal = false;
    },
    openMergeModal() {
      this.showMergeModal = true;
    },
    async toggleBot() {
      if (this.isLoading) {
        return;
      }

      const previousState = this.localBotActive;
      // Optimistic update
      this.localBotActive = !this.localBotActive;
      this.isLoading = true;

      try {
        const currentAttributes = this.contact.custom_attributes || {};
        const newAttributes = {
          ...currentAttributes,
          bot_ativo: this.localBotActive,
        };

        await this.$store.dispatch('contacts/update', {
          id: this.contact.id,
          custom_attributes: newAttributes,
        });
      } catch (error) {
        // Revert on error
        this.localBotActive = previousState;
        useAlert(this.$t('CONTACT_PANEL.UPDATE.ERROR_MESSAGE'));
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<template>
  <div class="relative items-center w-full p-4">
    <div class="flex flex-col w-full gap-2 text-left rtl:text-right">
      <div class="flex flex-row justify-between">
        <Avatar
          v-if="showAvatar"
          :src="contact.thumbnail"
          :name="contact.name"
          :status="contact.availability_status"
          :size="48"
          hide-offline-status
          rounded-full
        />
      </div>

      <div class="flex flex-col items-start gap-1.5 min-w-0 w-full">
        <div v-if="showAvatar" class="flex items-center w-full min-w-0 gap-3">
          <h3
            class="flex-shrink max-w-full min-w-0 my-0 text-base capitalize break-words text-n-slate-12"
          >
            {{ contact.name }}
          </h3>
          <div class="flex flex-row items-center gap-2">
            <span
              v-if="contact.created_at"
              v-tooltip.left="
                `${$t('CONTACT_PANEL.CREATED_AT_LABEL')} ${dynamicTime(
                  contact.created_at
                )}`
              "
              class="i-lucide-info text-sm text-n-slate-10"
            />
            <a
              :href="contactProfileLink"
              target="_blank"
              rel="noopener nofollow noreferrer"
              class="leading-3"
            >
              <span class="i-lucide-external-link text-sm text-n-slate-10" />
            </a>
          </div>
        </div>

        <p v-if="additionalAttributes.description" class="break-words mb-0.5">
          {{ additionalAttributes.description }}
        </p>
        <div class="flex flex-col items-start w-full gap-2">
          <ContactInfoRow
            :href="contact.email ? `mailto:${contact.email}` : ''"
            :value="contact.email"
            icon="mail"
            emoji="✉️"
            :title="$t('CONTACT_PANEL.EMAIL_ADDRESS')"
            show-copy
          />
          <ContactInfoRow
            :href="contact.phone_number ? `tel:${contact.phone_number}` : ''"
            :value="contact.phone_number"
            icon="call"
            emoji="📞"
            :title="$t('CONTACT_PANEL.PHONE_NUMBER')"
            show-copy
          />
          <ContactInfoRow
            v-if="contact.identifier"
            :value="contact.identifier"
            icon="contact-identify"
            emoji="🪪"
            :title="$t('CONTACT_PANEL.IDENTIFIER')"
          />
          <ContactInfoRow
            :value="additionalAttributes.company_name"
            icon="building-bank"
            emoji="🏢"
            :title="$t('CONTACT_PANEL.COMPANY')"
          />
          <ContactInfoRow
            v-if="location || additionalAttributes.location"
            :value="location || additionalAttributes.location"
            icon="map"
            emoji="🌍"
            :title="$t('CONTACT_PANEL.LOCATION')"
          />
          <SocialIcons :social-profiles="socialProfiles" />
        </div>
      </div>
        <div class="flex items-center justify-between w-full py-1 mb-2 ltr:-ml-1 rtl:-mr-1" title="Habilitar Bot">
          <div class="flex items-center gap-2 text-n-slate-11">
            <!-- Ícone do Robô -->
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              class="flex-shrink-0 icon--font bot ltr:ml-1 rtl:mr-1"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.753 14a2.25 2.25 0 0 1 2.25 2.25v.905a3.75 3.75 0 0 1-1.307 2.846C17.13 21.345 14.89 22 12 22c-2.89 0-5.128-.656-6.691-2a3.75 3.75 0 0 1-1.306-2.843v-.908A2.25 2.25 0 0 1 6.253 14h11.5Zm0 1.5h-11.5a.75.75 0 0 0-.75.75v.908c0 .655.286 1.278.784 1.706C7.545 19.945 9.44 20.502 12 20.502c2.56 0 4.458-.557 5.719-1.64a2.25 2.25 0 0 0 .784-1.706v-.906a.75.75 0 0 0-.75-.75ZM11.898 2.008 12 2a.75.75 0 0 1 .743.648l.007.102V3.5h3.5a2.25 2.25 0 0 1 2.25 2.25v4.505a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25V5.75A2.25 2.25 0 0 1 7.75 3.5h3.5v-.749a.75.75 0 0 1 .648-.743L12 2l-.102.007ZM16.25 5h-8.5a.75.75 0 0 0-.75.75v4.505c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75V5.75a.75.75 0 0 0-.75-.75Zm-6.5 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm4.492 0a1.25 1.25 0 1 1 0 2.499 1.25 1.25 0 0 1 0-2.499Z"
                fill="currentColor"
              ></path>
            </svg>
            <span
              class="overflow-hidden text-sm whitespace-nowrap text-ellipsis"
            >
              Habilitar Bot
            </span>
          </div>

          <!-- Botão Switch -->
          <button
            type="button"
            class="relative h-4 w-7 transition-colors duration-200 ease-in-out rounded-full focus:outline-none focus:ring-1 focus:ring-n-brand flex-shrink-0"
            role="switch"
            :class="localBotActive ? 'bg-n-brand' : 'bg-slate-200'"
            :aria-checked="localBotActive.toString()"
            @click="toggleBot"
          >
            <span class="sr-only">Alternar botão</span>
            <span
              :class="localBotActive ? 'translate-x-3' : 'translate-x-0'"
              class="absolute top-0.5 left-0.5 h-3 w-3 transform rounded-full shadow-sm transition-transform duration-200 ease-in-out bg-white"
            ></span>
          </button>
        </div>
      <div class="flex items-center w-full mt-0.5 gap-2">
        <ComposeConversation
          :contact-id="String(contact.id)"
          is-modal
          @close="closeComposeConversationModal"
        >
          <template #trigger="{ toggle }">
            <NextButton
              v-tooltip.top-end="$t('CONTACT_PANEL.NEW_MESSAGE')"
              icon="i-ph-chat-circle-dots"
              slate
              faded
              sm
              @click="openComposeConversationModal(toggle)"
            />
          </template>
        </ComposeConversation>
        <VoiceCallButton
          :phone="contact.phone_number"
          :contact-id="contact.id"
          icon="i-ri-phone-fill"
          size="sm"
          :tooltip-label="$t('CONTACT_PANEL.CALL')"
          slate
          faded
        />
        <NextButton
          v-tooltip.top-end="$t('EDIT_CONTACT.BUTTON_LABEL')"
          icon="i-ph-pencil-simple"
          slate
          faded
          sm
          @click="toggleEditModal"
        />
        <NextButton
          v-tooltip.top-end="$t('CONTACT_PANEL.MERGE_CONTACT')"
          icon="i-ph-arrows-merge"
          slate
          faded
          sm
          :disabled="uiFlags.isMerging"
          @click="openMergeModal"
        />
        <NextButton
          v-if="isAdmin"
          v-tooltip.top-end="$t('DELETE_CONTACT.BUTTON_LABEL')"
          icon="i-ph-trash"
          slate
          faded
          sm
          ruby
          :disabled="uiFlags.isDeleting"
          @click="toggleDeleteModal"
        />
      </div>
      <EditContact
        v-if="showEditModal"
        :show="showEditModal"
        :contact="contact"
        @cancel="toggleEditModal"
      />
      <ContactMergeModal
        v-if="showMergeModal"
        :primary-contact="contact"
        :show="showMergeModal"
        @close="closeMergeModal"
      />
    </div>
    <woot-delete-modal
      v-if="showDeleteModal"
      v-model:show="showDeleteModal"
      :on-close="closeDelete"
      :on-confirm="confirmDeletion"
      :title="$t('DELETE_CONTACT.CONFIRM.TITLE')"
      :message="$t('DELETE_CONTACT.CONFIRM.MESSAGE')"
      :message-value="confirmDeleteMessage"
      :confirm-text="$t('DELETE_CONTACT.CONFIRM.YES')"
      :reject-text="$t('DELETE_CONTACT.CONFIRM.NO')"
    />
  </div>
</template>
