import {
  Minus,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  AlertTriangle,
  Circle,
  CircleDot,
  CircleDashed,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { TaskPriority, StatusCategory } from '@manatask/shared';

interface PriorityMeta {
  icon: LucideIcon;
  className: string;
  labelKey: string;
}

export const PRIORITY_META: Record<TaskPriority, PriorityMeta> = {
  [TaskPriority.NONE]: { icon: Minus, className: 'text-muted', labelKey: 'priority.none' },
  [TaskPriority.LOW]: { icon: ArrowDown, className: 'text-sky-500', labelKey: 'priority.low' },
  [TaskPriority.MEDIUM]: { icon: ArrowRight, className: 'text-amber-500', labelKey: 'priority.medium' },
  [TaskPriority.HIGH]: { icon: ArrowUp, className: 'text-orange-500', labelKey: 'priority.high' },
  [TaskPriority.URGENT]: { icon: AlertTriangle, className: 'text-danger', labelKey: 'priority.urgent' },
};

interface CategoryMeta {
  icon: LucideIcon;
  dot: string;
  text: string;
}

export const CATEGORY_META: Record<StatusCategory, CategoryMeta> = {
  [StatusCategory.BACKLOG]: { icon: CircleDashed, dot: 'bg-slate-400', text: 'text-slate-400' },
  [StatusCategory.TODO]: { icon: Circle, dot: 'bg-slate-500', text: 'text-slate-500' },
  [StatusCategory.IN_PROGRESS]: { icon: CircleDot, dot: 'bg-accent', text: 'text-accent' },
  [StatusCategory.DONE]: { icon: CheckCircle2, dot: 'bg-success', text: 'text-success' },
  [StatusCategory.CANCELLED]: { icon: XCircle, dot: 'bg-danger', text: 'text-danger' },
};
