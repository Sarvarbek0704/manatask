import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { WorkspaceRole, StatusCategory } from '@manatask/shared';
import { AppDataSource } from './data-source';
import { User, Workspace, WorkspaceMember, Project, ProjectStatus } from './entities';
import { defaultStatuses, slugify } from '../common/util';

const OWNER = { email: 'missnur4339@gmail.com', name: 'Nurxon' };
const ADMINS = [{ email: 'khurshidjon.kh@gmail.com', name: 'Xurshidjon' }];
const WORKERS = [
  { email: 'coolsarvar2007@gmail.com', name: 'Sarvarbek' },
  { email: 'quldashevshavkat48@gmail.com', name: 'Shavkat' },
  { email: 'ruhshonasoyibova8@gmail.com', name: 'Ruhshona' },
  { email: 'begimqulova3005@gmail.com', name: "Go'zal" },
  { email: 'markovalex1300@gmail.com', name: 'Asror' },
  { email: 'meislam634@gmail.com', name: 'Islom' },
  { email: 'abbos2004off@gmail.com', name: 'Abbos' },
  { email: 'shohjahon.0407.19@gmail.com', name: 'Shohjahon' },
];

async function run() {
  await AppDataSource.initialize();
  console.log('🌱 Seeding ManaJoy workspace...');

  const users = AppDataSource.getRepository(User);
  const workspaces = AppDataSource.getRepository(Workspace);
  const members = AppDataSource.getRepository(WorkspaceMember);
  const projects = AppDataSource.getRepository(Project);
  const statusesRepo = AppDataSource.getRepository(ProjectStatus);

  const passwordHash = await bcrypt.hash('password123', 10);

  // Upsert a user: create if missing, otherwise refresh name/password/verified.
  const upsertUser = async (email: string, name: string) => {
    const e = email.toLowerCase().trim();
    let user = await users.findOne({ where: { email: e } });
    if (!user) {
      user = users.create({ email: e, name, passwordHash, locale: 'uz', emailVerified: true });
    } else {
      user.name = name;
      user.passwordHash = passwordHash;
      user.emailVerified = true;
    }
    return users.save(user);
  };

  const owner = await upsertUser(OWNER.email, OWNER.name);
  const admins = await Promise.all(ADMINS.map((a) => upsertUser(a.email, a.name)));
  const workers = await Promise.all(WORKERS.map((w) => upsertUser(w.email, w.name)));

  // Workspace (idempotent by slug).
  const slug = slugify('ManaJoy');
  let ws = await workspaces.findOne({ where: { slug } });
  if (!ws) ws = await workspaces.save(workspaces.create({ name: 'ManaJoy', slug }));

  const ensureMember = async (userId: string, role: WorkspaceRole) => {
    const existing = await members.findOne({ where: { workspaceId: ws!.id, userId } });
    if (existing) {
      if (existing.role !== role) {
        existing.role = role;
        await members.save(existing);
      }
      return;
    }
    await members.save(members.create({ workspaceId: ws!.id, userId, role }));
  };

  await ensureMember(owner.id, WorkspaceRole.OWNER);
  for (const a of admins) await ensureMember(a.id, WorkspaceRole.ADMIN);
  for (const w of workers) await ensureMember(w.id, WorkspaceRole.MEMBER);

  // Main project "ManaJoy" (idempotent by key), with default status columns. No tasks.
  let project = await projects.findOne({ where: { workspaceId: ws.id, key: 'MJ' } });
  if (!project) {
    project = await projects.save(
      projects.create({
        workspaceId: ws.id,
        name: 'ManaJoy',
        key: 'MJ',
        description: 'Main project',
        color: '#138067',
      }),
    );
    await statusesRepo.save(
      defaultStatuses().map((s) =>
        statusesRepo.create({
          projectId: project!.id,
          name: s.name,
          category: s.category as StatusCategory,
          color: s.color,
          order: s.order,
        }),
      ),
    );
  }

  console.log('✅ ManaJoy seed complete.');
  console.log(`   Workspace: ManaJoy (${ws.id})`);
  console.log(`   Owner : ${OWNER.email}`);
  console.log(`   Admin : ${ADMINS.map((a) => a.email).join(', ')}`);
  console.log(`   Workers: ${WORKERS.length}`);
  console.log('   Password for everyone: password123');
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error('ManaJoy seed failed:', err);
  process.exit(1);
});
