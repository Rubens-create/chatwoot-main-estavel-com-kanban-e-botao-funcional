
import { frontendURL } from 'dashboard/helper/URLHelper';
const KanbanView = () => import('./KanbanView.vue');

export const routes = [
    {
        path: frontendURL('accounts/:accountId/kanban'),
        component: KanbanView,
        name: 'kanban_view',
        meta: {
            permissions: ['administrator', 'agent'],
        },
    },
];
