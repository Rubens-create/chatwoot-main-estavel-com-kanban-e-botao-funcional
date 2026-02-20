<script>
import { mapGetters } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { applyThemeColor, generatePalette } from 'dashboard/helper/themeHelper';
import SectionLayout from './SectionLayout.vue';
import NextInput from 'next/input/Input.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';
import WithLabel from 'v3/components/Form/WithLabel.vue';

const DEFAULT_THEME_COLOR = '#1F93FF';
const PRESET_COLORS = [
  '#1F93FF', // Azul
  '#FFCC00', // Amarelo
  '#10B981', // Verde
  '#EF4444', // Vermelho
  '#8B5CF6', // Roxo
  '#F97316', // Laranja
  '#EC4899', // Rosa
  '#06B6D4', // Ciano
  '#000000', // Preto
];

export default {
  components: {
    SectionLayout,
    NextInput,
    NextButton,
    WithLabel,
  },
  props: {
    accountId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      selectedColor: '',
      presetColors: PRESET_COLORS,
    };
  },
  computed: {
    ...mapGetters({
      getAccount: 'accounts/getAccount',
      uiFlags: 'accounts/getUIFlags',
      currentUser: 'getCurrentUser',
    }),
    isAdmin() {
      // Assuming currentUser has role or we can check accountUser role
      // But typically only admins can access the account settings page anyway
      // To be safe, let's verify if they have the role:
      if (this.currentUser.role === 'administrator' || this.getAccount(this.accountId).role === 'administrator') return true;
      return true; // The settings page is usually protected by router meta
    },
    isUpdating() {
      return this.uiFlags.isUpdating;
    },
    generatedPalette() {
      if (!this.selectedColor) return null;
      try {
        const palette = generatePalette(this.selectedColor);
        // Exclude primary and textOnPrimary for the grid preview
        const shades = {};
        Object.keys(palette).forEach((key) => {
          if (key !== 'primary' && key !== 'textOnPrimary') {
            shades[key] = palette[key];
          }
        });
        return shades;
      } catch (e) {
        return null;
      }
    }
  },
  watch: {
    accountId: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          const account = this.getAccount(newVal);
          this.selectedColor = account.theme_color || DEFAULT_THEME_COLOR;
        }
      },
    },
  },
  methods: {
    previewColor() {
      if (this.selectedColor && this.selectedColor.match(/^#[0-9A-F]{6}$/i)) {
        applyThemeColor(this.selectedColor);
      }
    },
    selectColor(color) {
      this.selectedColor = color;
      this.previewColor();
    },
    async saveColor() {
      try {
        await this.$store.dispatch('accounts/update', {
          theme_color: this.selectedColor
        });
        useAlert(this.$t('GENERAL_SETTINGS.UPDATE.SUCCESS'));
      } catch (error) {
        useAlert(this.$t('GENERAL_SETTINGS.UPDATE.ERROR'));
      }
    },
    resetColor() {
      this.selectedColor = DEFAULT_THEME_COLOR;
      this.previewColor();
      this.saveColor();
    }
  }
};
</script>

<template>
  <SectionLayout
    v-if="isAdmin"
    title="Aparência Global (Theme)"
    description="Escolha a cor principal que será aplicada a todo o sistema e widgets desta conta."
  >
    <div class="theme-color-picker bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
      <div class="flex items-end gap-4 mb-4">
        <div class="flex flex-col">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Seletor Nativo</label>
          <input
            v-model="selectedColor"
            type="color"
            class="h-10 w-16 cursor-pointer !p-0 border-none rounded-md"
            @input="previewColor"
          />
        </div>
        <div class="flex-grow">
          <WithLabel label="Código da Cor (HEX)">
            <NextInput
              v-model="selectedColor"
              type="text"
              placeholder="#FFCC00"
              maxlength="7"
              class="w-full"
              @input="previewColor"
            />
          </WithLabel>
        </div>
      </div>

      <div class="mb-6">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Cores Rápidas</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="color in presetColors"
            :key="color"
            class="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition-transform border border-slate-200 dark:border-slate-700 focus:outline-none"
            :style="{ backgroundColor: color }"
            @click="selectColor(color)"
            title="Selecionar esta cor"
          />
        </div>
      </div>

      <div class="mb-6" v-if="generatedPalette">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Preview da Paleta</label>
        <div class="grid grid-cols-6 md:grid-cols-12 gap-1">
          <div
            v-for="(hex, key) in generatedPalette"
            :key="key"
            class="h-8 rounded flex items-center justify-center text-[10px] text-white opacity-90 shadow-sm"
            :style="{ backgroundColor: hex }"
            :title="`w-${key}`"
          >
            <!-- <span class="drop-shadow-md">{{ key }}</span> -->
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <NextButton
          color="slate"
          variant="clear"
          @click="resetColor"
        >
          Resetar Padrão
        </NextButton>
        <NextButton
          blue
          :is-loading="isUpdating"
          @click="saveColor"
        >
          Salvar Cor
        </NextButton>
      </div>
    </div>
  </SectionLayout>
</template>
