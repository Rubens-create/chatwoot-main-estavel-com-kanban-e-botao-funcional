<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import draggable from 'vuedraggable';
import Avatar from 'next/avatar/Avatar.vue';
import Button from 'dashboard/components-next/button/Button.vue';

// ─── Labels Helpers ───────────────────────────────────────────────────────────
// Calcula a cor de texto (preto ou branco) com base na luminância do fundo
const getContrastColor = (hexColor) => {
  if (!hexColor) return '#000000';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Fórmula de luminância perceptiva
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
};

const COLUMNS_DEFAULT = ['New'];

const store = useStore();
const { t } = useI18n();

// Safe Computed Properties
const contacts = computed(() => {
  return store.getters['contacts/getContacts'] || [];
});

// Store de definições de labels (com cor, título, etc.)
const allLabels = computed(() => {
  return store.getters['labels/getLabels'] || [];
});

// Mapa rápido: título (lowercase) → objeto label {color, title}
const labelsMap = computed(() => {
  const map = {};
  allLabels.value.forEach(label => {
    map[label.title.toLowerCase()] = label;
  });
  return map;
});

// Retorna as labels de um contato com as cores resolvidas
const getContactLabels = (contactId) => {
  const labelNames = store.getters['contactLabels/getContactLabels'](contactId) || [];
  return labelNames.slice(0, 4).map(name => {
    const definition = labelsMap.value[name.toLowerCase()] || {};
    return {
      title: definition.title || name,
      color: definition.color || '#64748b',
    };
  });
};

const uiFlags = computed(() => {
  return store.getters['contacts/getUIFlags'] || { isFetching: false, isFetchingItem: false };
});

const attributes = computed(() => {
  return store.getters['attributes/getAttributesByModel']('contact_attribute') || [];
});

const kanbanAttribute = computed(() => {
  return attributes.value.find(attr => attr.attribute_key === 'status_kanban');
});

const kanbanColumns = computed(() => {
  if (kanbanAttribute.value) {
    // Chatwoot stores list values in 'attribute_values', but sometimes 'values' might be used in other contexts.
    // We try 'attribute_values' first as it is the standard for backend definitions.
    const values = kanbanAttribute.value.attribute_values || kanbanAttribute.value.values;
    if (values && values.length > 0) {
      return values;
    }
  }
  return [...COLUMNS_DEFAULT];
});

// Local state for draggable columns
const columnsData = ref({});
const newColumnName = ref('');
const showAddColumn = ref(false);

const isLoading = computed(() => {
  return uiFlags.value.isFetching || uiFlags.value.isFetchingItem;
});

// Sync store contacts to local columns
const syncContactsToColumns = () => {
  const newColumns = {};
  
  // Initialize all columns with empty arrays
  const columns = kanbanColumns.value || [];
  columns.forEach(col => {
    newColumns[col] = [];
  });

  const allContacts = contacts.value || [];

  allContacts.forEach(contact => {
    let status = contact.custom_attributes?.status_kanban;
    
    // Fallback: if status is missing or not in current columns, put in first column
    if (!status || !newColumns[status]) {
      status = columns[0] || 'New';
    }
    
    // Ensure column exists before pushing
    if (newColumns[status]) {
      newColumns[status].push(contact);
    }
  });

  columnsData.value = newColumns;
};

// Watch for changes in contacts or columns to update local state
watch([contacts, kanbanColumns], syncContactsToColumns, { deep: true, immediate: true });

onMounted(() => {
  store.dispatch('contacts/get');
  store.dispatch('attributes/get');
  store.dispatch('labels/get');
});

// Carrega labels de cada contato quando a lista de contatos mudar
watch(contacts, (newContacts) => {
  newContacts.forEach(contact => {
    store.dispatch('contactLabels/get', contact.id);
  });
}, { immediate: true });

const onDragChange = (event, column) => {
  if (event.added) {
    const contact = event.added.element;
    const newStatus = column;

    const currentAttributes = contact.custom_attributes || {};
    const updatedAttributes = {
      ...currentAttributes,
      status_kanban: newStatus,
    };

    store.dispatch('contacts/update', {
      id: contact.id,
      custom_attributes: updatedAttributes,
    });
  }
};

const addColumn = async () => {
  if (!newColumnName.value) return;

  try {
    const currentValues = kanbanColumns.value;
    const newValues = [...currentValues, newColumnName.value];
    
    if (kanbanAttribute.value) {
      await store.dispatch('attributes/update', {
        id: kanbanAttribute.value.id,
        attribute_values: newValues,
        attribute_display_type: 6, // List type
        attribute_key: 'status_kanban',
        attribute_model: 'contact_attribute',
      });
    }
    newColumnName.value = '';
    showAddColumn.value = false;
  } catch (error) {
    console.error(error);
  }
};
</script>

<template>
  <div class="flex flex-col w-full h-full overflow-hidden bg-n-solid-1">
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <span class="text-n-slate-11">Carregando Leads...</span>
    </div>
    <div v-else class="flex flex-col w-full h-full overflow-hidden">
    <header class="flex items-center justify-between px-6 py-4 border-b border-n-strong">
      <h1 class="text-xl font-medium text-n-slate-12">{{ 'Pipeline de Leads' }}</h1>
    </header>

    <div class="flex flex-grow p-6 overflow-x-auto gap-4">
      <div
        v-for="(column, index) in (kanbanColumns || [])"
        :key="column"
        class="flex flex-col flex-shrink-0 w-80 max-h-full rounded-lg bg-n-solid-2 border border-n-weak"
      >
        <!-- Column Header -->
        <div class="flex items-center justify-between p-3 border-b border-n-weak">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm text-n-slate-12">{{ column }}</span>
            <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-n-solid-3 text-n-slate-11">
              {{ (columnsData[column] || []).length || 0 }}
            </span>
          </div>
          <Button
            v-if="index !== 0" 
            icon="i-lucide-plus"
            size="xs"
            color="slate"
            variant="ghost"
            class="!p-1"
          />
        </div>

        <!-- Draggable Area -->
        <div class="flex-grow overflow-y-auto p-2 scrollbar-thin">
          <draggable
            :list="columnsData[column] || []"
            group="contacts"
            item-key="id"
            class="flex flex-col gap-2 min-h-[100px]"
            @change="(event) => onDragChange(event, column)"
          >
            <template #item="{ element }">
              <div
                class="p-3 bg-n-solid-1 rounded-md border border-n-weak shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow"
              >
                <div class="flex items-start gap-3">
                  <Avatar
                    :src="element.thumbnail"
                    :name="element.name"
                    size="32"
                    rounded-full
                  />
                  <div class="flex flex-col min-w-0 gap-1">
                    <span class="text-sm font-medium text-n-slate-12 truncate block">
                      {{ element.name }}
                    </span>
                    <span class="text-xs text-n-slate-10 truncate block">
                      {{ element.email }}
                    </span>
                    <span v-if="element.phone_number" class="text-xs text-n-slate-10 truncate block">
                      {{ element.phone_number }}
                    </span>

                    <!-- Labels / Etiquetas do Contato -->
                    <div
                      v-if="getContactLabels(element.id).length > 0"
                      class="flex flex-wrap gap-1 mt-1"
                    >
                      <span
                        v-for="label in getContactLabels(element.id).slice(0, 3)"
                        :key="label.title"
                        class="label-badge"
                        :style="{
                          backgroundColor: label.color,
                          color: getContrastColor(label.color),
                        }"
                      >
                        {{ label.title }}
                      </span>
                      <!-- Contador de labels excedentes -->
                      <span
                        v-if="getContactLabels(element.id).length > 3"
                        class="label-badge label-badge--extra"
                      >
                        +{{ getContactLabels(element.id).length - 3 }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>

      <!-- Add Column Section -->
      <div class="flex-shrink-0 w-80">
        <div v-if="!showAddColumn" class="p-2">
            <Button
                label="Adicionar Coluna"
                icon="i-lucide-plus"
                color="slate"
                variant="ghost" 
                class="w-full justify-start"
                @click="showAddColumn = true"
            />
        </div>
        <div v-else class="p-4 bg-n-solid-2 rounded-lg border border-n-weak flex flex-col gap-2">
            <input 
                v-model="newColumnName" 
                type="text" 
                placeholder="Nome da coluna" 
                class="w-full px-3 py-2 text-sm text-n-slate-12 bg-n-solid-1 border border-n-weak rounded-md focus:outline-none focus:ring-1 focus:ring-n-brand"
                @keyup.enter="addColumn"
            />
            <div class="flex gap-2 justify-end">
                <Button label="Cancelar" size="sm" variant="ghost" @click="showAddColumn = false" />
                <Button label="Salvar" size="sm" @click="addColumn" />
            </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: var(--n-slate-6);
  border-radius: 3px;
}

/* Labels / Etiquetas */
.label-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-badge--extra {
  background-color: var(--n-slate-4, #e2e8f0);
  color: var(--n-slate-11, #475569);
}
</style>
