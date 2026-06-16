import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import {
  WorkspaceRole,
  TaskPriority,
  StatusCategory,
  SprintState,
} from '@manatask/shared';
import { AppDataSource } from './data-source';
import {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  ProjectStatus,
  Label,
  Sprint,
  Task,
} from './entities';
import { defaultStatuses, ORDER_STEP } from '../common/util';

async function run() {
  await AppDataSource.initialize();
  console.log('🌱 Seeding manaTask demo data...');

  const users = AppDataSource.getRepository(User);
  const workspaces = AppDataSource.getRepository(Workspace);
  const members = AppDataSource.getRepository(WorkspaceMember);
  const projects = AppDataSource.getRepository(Project);
  const statusesRepo = AppDataSource.getRepository(ProjectStatus);
  const labelsRepo = AppDataSource.getRepository(Label);
  const sprintsRepo = AppDataSource.getRepository(Sprint);
  const tasksRepo = AppDataSource.getRepository(Task);

  const passwordHash = await bcrypt.hash('password123', 10);

  const mkUser = async (email: string, name: string, pwHash = passwordHash) => {
    const existing = await users.findOne({ where: { email } });
    if (existing) {
      // Demo accounts are pre-verified so they bypass OTP.
      if (!existing.emailVerified) {
        existing.emailVerified = true;
        await users.save(existing);
      }
      return existing;
    }
    return users.save(
      users.create({ email, name, passwordHash: pwHash, locale: 'uz', emailVerified: true }),
    );
  };

  const owner = await mkUser('admin@manatask.local', 'Admin Aliyev');
  const dev = await mkUser('dev@manatask.local', 'Dilshod Developer');
  const pm = await mkUser('pm@manatask.local', 'Madina Manager');

  // Personal owner account (real email).
  const myHash = await bcrypt.hash('Sarvarbek123', 10);
  const me = await mkUser('coolsarvar2007@gmail.com', 'Sarvarbek (Owner)', myHash);

  let ws = await workspaces.findOne({ where: { slug: 'demo' } });
  if (!ws) {
    ws = await workspaces.save(workspaces.create({ name: 'Demo Workspace', slug: 'demo' }));
  }

  const ensureMember = async (userId: string, role: WorkspaceRole) => {
    const existing = await members.findOne({ where: { workspaceId: ws!.id, userId } });
    if (!existing) {
      await members.save(members.create({ workspaceId: ws!.id, userId, role }));
    }
  };
  await ensureMember(owner.id, WorkspaceRole.OWNER);
  await ensureMember(me.id, WorkspaceRole.OWNER);
  await ensureMember(pm.id, WorkspaceRole.ADMIN);
  await ensureMember(dev.id, WorkspaceRole.MEMBER);

  let project = await projects.findOne({ where: { workspaceId: ws.id, key: 'CORE' } });
  if (!project) {
    project = await projects.save(
      projects.create({
        workspaceId: ws.id,
        name: 'Core Platform',
        key: 'CORE',
        description: 'Demo project to explore manaTask',
        color: '#6366f1',
      }),
    );
    const statuses = defaultStatuses().map((s) =>
      statusesRepo.create({
        projectId: project!.id,
        name: s.name,
        category: s.category as StatusCategory,
        color: s.color,
        order: s.order,
      }),
    );
    await statusesRepo.save(statuses);
  }

  const statuses = await statusesRepo.find({ where: { projectId: project.id }, order: { order: 'ASC' } });
  const byCat = (c: StatusCategory) => statuses.find((s) => s.category === c) ?? statuses[0];

  const labelNames = [
    { name: 'bug', color: '#ef4444' },
    { name: 'feature', color: '#22c55e' },
    { name: 'frontend', color: '#3b82f6' },
    { name: 'backend', color: '#a855f7' },
  ];
  const labels: Label[] = [];
  for (const l of labelNames) {
    let label = await labelsRepo.findOne({ where: { workspaceId: ws.id, name: l.name } });
    if (!label) label = await labelsRepo.save(labelsRepo.create({ workspaceId: ws.id, ...l }));
    labels.push(label);
  }

  let sprint = await sprintsRepo.findOne({ where: { projectId: project.id, name: 'Sprint 1' } });
  if (!sprint) {
    sprint = await sprintsRepo.save(
      sprintsRepo.create({
        projectId: project.id,
        name: 'Sprint 1',
        goal: 'Ship the MVP',
        state: SprintState.ACTIVE,
        startDate: new Date(),
      }),
    );
  }

  const existingTasks = await tasksRepo.count({ where: { projectId: project.id } });
  if (existingTasks === 0) {
    const seedTasks = [
      { title: 'Set up authentication', cat: StatusCategory.DONE, prio: TaskPriority.HIGH, assignee: dev.id, labels: [labels[3]] },
      { title: 'Design Kanban board', cat: StatusCategory.IN_PROGRESS, prio: TaskPriority.MEDIUM, assignee: dev.id, labels: [labels[2], labels[1]] },
      { title: 'Workspace invitations', cat: StatusCategory.TODO, prio: TaskPriority.MEDIUM, assignee: pm.id, labels: [labels[1]] },
      { title: 'Fix login redirect bug', cat: StatusCategory.TODO, prio: TaskPriority.URGENT, assignee: dev.id, labels: [labels[0]] },
      { title: 'Plan reporting dashboard', cat: StatusCategory.BACKLOG, prio: TaskPriority.LOW, assignee: pm.id, labels: [labels[1]] },
    ];
    let n = 0;
    for (const t of seedTasks) {
      n += 1;
      const status = byCat(t.cat);
      const due = new Date();
      due.setDate(due.getDate() + (n - 2) * 2);
      await tasksRepo.save(
        tasksRepo.create({
          workspaceId: ws.id,
          projectId: project.id,
          number: n,
          title: t.title,
          statusId: status.id,
          priority: t.prio,
          assigneeId: t.assignee,
          reporterId: owner.id,
          sprintId: sprint.id,
          dueDate: due,
          order: n * ORDER_STEP,
          labels: t.labels,
        }),
      );
    }
    project.taskCounter = seedTasks.length;
    await projects.save(project);
  }

  console.log('✅ Seed complete.');
  console.log('   Owner (you): coolsarvar2007@gmail.com / Sarvarbek123  (workspace: Demo)');
  console.log('   Demo owner : admin@manatask.local / password123');
  console.log('   Also       : pm@manatask.local, dev@manatask.local / password123');
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
