'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Workspace,
  WorkspaceMember,
  Project,
  Task,
  Label,
  Sprint,
  Comment,
  Notification,
  DashboardSummary,
  AnalyticsReport,
  WorkLog,
  WorkLogSummary,
  CreateWorkLogDto,
  Challenge,
  ChallengeProgress,
  Paginated,
  CreateTaskDto,
  UpdateTaskDto,
  CreateProjectDto,
} from '@manatask/shared';
import { api } from './api';

type WorkspaceWithRole = Workspace & { role: string };

// ---- Workspaces ----
export function useMyWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => (await api.get<WorkspaceWithRole[]>('/workspaces')).data,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      (await api.post<Workspace>('/workspaces', { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () =>
      (await api.get<WorkspaceMember[]>('/workspaces/current/members')).data,
  });
}

export function useInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; role: string }) =>
      (await api.post('/workspaces/current/invitations', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  });
}

export function useInvitations(enabled = true) {
  return useQuery({
    queryKey: ['invitations'],
    enabled,
    queryFn: async () => (await api.get('/workspaces/current/invitations')).data,
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string; logoUrl?: string }) =>
      (await api.patch('/workspaces/current', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useActivity(page = 1) {
  return useQuery({
    queryKey: ['activity', page],
    queryFn: async () => (await api.get('/activity', { params: { page } })).data as {
      items: {
        id: string;
        action: string;
        entityType: string;
        entityId: string;
        actor: { id: string | null; name: string; avatarUrl: string | null };
        meta: Record<string, unknown> | null;
        createdAt: string;
      }[];
      total: number;
      page: number;
      pageSize: number;
    },
  });
}

// ---- Projects ----
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });
}

export function useProject(id?: string) {
  return useQuery({
    queryKey: ['project', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Project>(`/projects/${id}`)).data,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateProjectDto) =>
      (await api.post<Project>('/projects', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

// ---- Labels & Sprints ----
export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: async () => (await api.get<Label[]>('/labels')).data,
  });
}

export function useSprints(projectId?: string) {
  return useQuery({
    queryKey: ['sprints', projectId],
    enabled: !!projectId,
    queryFn: async () => (await api.get<Sprint[]>(`/projects/${projectId}/sprints`)).data,
  });
}

// ---- Tasks ----
export function useTasks(params: Record<string, string | undefined>) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== ''),
  );
  return useQuery({
    queryKey: ['tasks', clean],
    queryFn: async () =>
      (await api.get<Paginated<Task>>('/tasks', { params: clean })).data,
  });
}

export function useTask(id?: string) {
  return useQuery({
    queryKey: ['task', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Task>(`/tasks/${id}`)).data,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTaskDto) =>
      (await api.post<Task>('/tasks', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateTaskDto }) =>
      (await api.patch<Task>(`/tasks/${id}`, body)).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', v.id] });
    },
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statusId, order }: { id: string; statusId: string; order: number }) =>
      (await api.patch<Task>(`/tasks/${id}/move`, { statusId, order })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/tasks/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ---- Comments ----
export function useComments(taskId?: string) {
  return useQuery({
    queryKey: ['comments', taskId],
    enabled: !!taskId,
    queryFn: async () => (await api.get<Comment[]>(`/tasks/${taskId}/comments`)).data,
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      (await api.post<Comment>(`/tasks/${taskId}/comments`, { body })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', taskId] }),
  });
}

// ---- Checklist ----
export function useAddChecklist(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) =>
      (await api.post(`/tasks/${taskId}/checklist`, { text })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  });
}

export function useToggleChecklist(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, done }: { itemId: string; done: boolean }) =>
      (await api.patch(`/tasks/${taskId}/checklist/${itemId}`, { done })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  });
}

// ---- Notifications ----
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Notification[]>('/notifications')).data,
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.patch('/notifications/read-all')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ---- Reports ----
export function useDashboard(projectId?: string) {
  return useQuery({
    queryKey: ['dashboard', projectId],
    queryFn: async () =>
      (await api.get<DashboardSummary>('/reports/dashboard', {
        params: projectId ? { projectId } : {},
      })).data,
  });
}

export function useAnalytics(params: { projectId?: string; days: number }) {
  const clean: Record<string, string> = { days: String(params.days) };
  if (params.projectId) clean.projectId = params.projectId;
  return useQuery({
    queryKey: ['analytics', clean],
    queryFn: async () => (await api.get<AnalyticsReport>('/reports/analytics', { params: clean })).data,
  });
}

// ---- Work logs ----
export function useWorkLogs(params: Record<string, string | undefined>) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  return useQuery({
    queryKey: ['worklogs', clean],
    queryFn: async () => (await api.get<Paginated<WorkLog>>('/worklogs', { params: clean })).data,
  });
}

export function useWorkLogSummary(params: { from?: string; to?: string }) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  return useQuery({
    queryKey: ['worklog-summary', clean],
    queryFn: async () => (await api.get<WorkLogSummary[]>('/worklogs/summary', { params: clean })).data,
  });
}

export function useCreateWorkLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateWorkLogDto) => (await api.post<WorkLog>('/worklogs', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worklogs'] });
      qc.invalidateQueries({ queryKey: ['worklog-summary'] });
    },
  });
}

export function useDeleteWorkLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/worklogs/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worklogs'] });
      qc.invalidateQueries({ queryKey: ['worklog-summary'] });
    },
  });
}

export function useWorkLog(id?: string) {
  return useQuery({
    queryKey: ['worklog', id],
    enabled: !!id,
    queryFn: async () => (await api.get<WorkLog>(`/worklogs/${id}`)).data,
  });
}

export function useReviewWorkLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, note }: { id: string; decision: 'accept' | 'reject'; note?: string }) =>
      (await api.patch<WorkLog>(`/worklogs/${id}/review`, { decision, note })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['worklogs'] });
      qc.invalidateQueries({ queryKey: ['worklog', v.id] });
      qc.invalidateQueries({ queryKey: ['challenge-progress'] });
    },
  });
}

export function useChallenge() {
  return useQuery({
    queryKey: ['challenge'],
    queryFn: async () => (await api.get<Challenge>('/worklogs/challenge')).data,
  });
}

export function useChallengeProgress(userId?: string) {
  return useQuery({
    queryKey: ['challenge-progress', userId ?? 'me'],
    queryFn: async () =>
      (await api.get<ChallengeProgress>('/worklogs/progress', {
        params: userId ? { userId } : {},
      })).data,
  });
}

export function useUpsertChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Challenge>) =>
      (await api.patch<Challenge>('/worklogs/challenge', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenge'] });
      qc.invalidateQueries({ queryKey: ['challenge-progress'] });
    },
  });
}

export function useVelocity(projectId?: string) {
  return useQuery({
    queryKey: ['velocity', projectId],
    enabled: !!projectId,
    queryFn: async () =>
      (await api.get('/reports/velocity', { params: { projectId } })).data as {
        sprintId: string;
        name: string;
        completed: number;
        estimateMinutes: number;
      }[],
  });
}
