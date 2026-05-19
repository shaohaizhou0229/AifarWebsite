import { ADMIN_PERMISSIONS, normalizeAdminPermissions } from "@/lib/admin-permissions";
import { getPostgresPool } from "@/lib/db";
import { createNotification, NOTIFICATION_EVENTS } from "@/lib/notifications";

export const TASK_STATUSES = new Set(["not_started", "in_progress", "blocked", "completed"]);
export const TASK_TYPES = new Set(["one_time", "recurring"]);
export const REPEAT_FREQUENCIES = new Set(["daily", "weekly", "monthly"]);

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value) {
  const next = clean(value);
  return next || null;
}

function nullableDate(value) {
  const next = clean(value);
  if (!next) return null;
  const date = new Date(next);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }
  return date.toISOString();
}

function normalizeStatus(value) {
  const status = clean(value) || "not_started";
  if (!TASK_STATUSES.has(status)) {
    throw new Error("Invalid task status.");
  }
  return status;
}

function normalizeTaskType(value) {
  const type = clean(value) || "one_time";
  if (!TASK_TYPES.has(type)) {
    throw new Error("Invalid task type.");
  }
  return type;
}

function normalizeRepeatFrequency(value, taskType) {
  const frequency = clean(value);
  if (taskType !== "recurring") return null;
  if (!REPEAT_FREQUENCIES.has(frequency)) {
    throw new Error("Repeat frequency is required.");
  }
  return frequency;
}

function nextRunFrom(dateValue, frequency) {
  if (!dateValue || !frequency) return null;
  const date = new Date(dateValue);
  if (frequency === "daily") date.setDate(date.getDate() + 1);
  if (frequency === "weekly") date.setDate(date.getDate() + 7);
  if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function permissionLabels(adminPermissions = []) {
  const permissions = normalizeAdminPermissions(adminPermissions);
  return {
    users: permissions.includes(ADMIN_PERMISSIONS.users),
    cms: permissions.includes(ADMIN_PERMISSIONS.product),
    downloads: permissions.includes(ADMIN_PERMISSIONS.downloads),
    docs: permissions.includes(ADMIN_PERMISSIONS.docs),
    support: permissions.includes(ADMIN_PERMISSIONS.support),
    contact: permissions.includes(ADMIN_PERMISSIONS.contact),
    collaboration: permissions.includes(ADMIN_PERMISSIONS.collaboration)
  };
}

function mapMember(row) {
  return {
    spaceId: row.space_id,
    userId: row.user_id,
    role: row.member_role,
    displayName: row.display_name,
    email: row.email,
    adminPermissions: normalizeAdminPermissions(row.admin_permissions),
    permissionSummary: permissionLabels(row.admin_permissions),
    createdAt: row.member_created_at || row.created_at
  };
}

function mapSubtask(row) {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    description: row.description,
    assigneeUserId: row.assignee_user_id,
    assigneeName: row.assignee_name,
    assigneeEmail: row.assignee_email,
    dueAt: row.due_at,
    status: row.status,
    dueSoonNotifiedAt: row.due_soon_notified_at,
    overdueNotifiedAt: row.overdue_notified_at,
    createdByUserId: row.created_by_user_id,
    statusChangedAt: row.status_changed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSubtaskUpdate(row) {
  return {
    id: row.id,
    subtaskId: row.subtask_id,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    authorEmail: row.author_email,
    previousStatus: row.previous_status,
    status: row.status,
    message: row.message,
    createdAt: row.created_at
  };
}

function mapTask(row, subtasks = []) {
  const completed = subtasks.filter((subtask) => subtask.status === "completed").length;
  const blocked = subtasks.filter((subtask) => subtask.status === "blocked").length;
  const progress = subtasks.length ? Math.round((completed / subtasks.length) * 100) : 0;
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    taskType: row.task_type,
    repeatFrequency: row.repeat_frequency,
    repeatLimit: row.repeat_limit,
    generatedCount: row.generated_count,
    nextRunAt: row.next_run_at,
    recurrenceTemplateId: row.recurrence_template_id,
    isRecurringClosed: row.is_recurring_closed,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subtasks,
    progress,
    completedSubtasks: completed,
    blockedSubtasks: blocked,
    totalSubtasks: subtasks.length
  };
}

function mapSpace(row, tasks = [], members = []) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    leaderUserId: row.leader_user_id,
    leaderName: row.leader_name,
    leaderEmail: row.leader_email,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    taskCount: Number(row.task_count || tasks.length || 0),
    openSubtaskCount: Number(row.open_subtask_count || 0),
    members,
    tasks
  };
}

export function canCreateCollaborationSpace(profile) {
  return profile?.role === "admin"
    && normalizeAdminPermissions(profile.adminPermissions).includes(ADMIN_PERMISSIONS.collaboration);
}

async function assertSpaceMember(spaceId, userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select s.leader_user_id, m.member_role
     from public.admin_collaboration_spaces s
     join public.admin_collaboration_space_members m on m.space_id = s.id
     where s.id = $1 and m.user_id = $2`,
    [spaceId, userId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Collaboration space not found.");
  return { isLeader: row.leader_user_id === userId || row.member_role === "leader" };
}

async function assertSpaceLeader(spaceId, userId) {
  const context = await assertSpaceMember(spaceId, userId);
  if (!context.isLeader) {
    throw new Error("Only the collaboration leader can perform this action.");
  }
  return context;
}

async function assertTaskAccess(taskId, userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select t.*, s.leader_user_id, m.member_role
     from public.admin_collaboration_tasks t
     join public.admin_collaboration_spaces s on s.id = t.space_id
     join public.admin_collaboration_space_members m on m.space_id = t.space_id
     where t.id = $1 and m.user_id = $2`,
    [taskId, userId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Task not found.");
  return { task: row, isLeader: row.leader_user_id === userId || row.member_role === "leader" };
}

async function assertSubtaskAccess(subtaskId, userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select st.*, assignee.display_name as assignee_name, assignee.email as assignee_email,
      t.space_id, t.title as task_title, t.created_by_user_id as task_created_by_user_id,
      s.name as space_name, s.leader_user_id, m.member_role
     from public.admin_collaboration_subtasks st
     join public.admin_collaboration_tasks t on t.id = st.task_id
     join public.admin_collaboration_spaces s on s.id = t.space_id
     join public.admin_collaboration_space_members m on m.space_id = t.space_id
     left join public.profiles assignee on assignee.id = st.assignee_user_id
     where st.id = $1 and m.user_id = $2`,
    [subtaskId, userId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Subtask not found.");
  const isLeader = row.leader_user_id === userId || row.member_role === "leader";
  const isAssignee = row.assignee_user_id === userId;
  const isTaskCreator = row.task_created_by_user_id === userId;
  const isSubtaskCreator = row.created_by_user_id === userId;
  return {
    subtask: row,
    isLeader,
    isAssignee,
    isTaskCreator,
    isSubtaskCreator,
    canUpdate: isLeader || isAssignee || isTaskCreator || isSubtaskCreator
  };
}

export async function listCollaborationSpaces(userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select s.*, leader.display_name as leader_name, leader.email as leader_email,
      count(distinct t.id) as task_count,
      count(distinct st.id) filter (where st.status <> 'completed') as open_subtask_count
     from public.admin_collaboration_spaces s
     join public.admin_collaboration_space_members m on m.space_id = s.id
     left join public.profiles leader on leader.id = s.leader_user_id
     left join public.admin_collaboration_tasks t on t.space_id = s.id
     left join public.admin_collaboration_subtasks st on st.task_id = t.id
     where m.user_id = $1
     group by s.id, leader.display_name, leader.email
     order by coalesce(s.updated_at, s.created_at) desc`,
    [userId]
  );
  return result.rows.map((row) => mapSpace(row));
}

export async function getCollaborationSpace(spaceId, userId) {
  await assertSpaceMember(spaceId, userId);
  const pool = getPostgresPool();
  const spaceResult = await pool.query(
    `select s.*, leader.display_name as leader_name, leader.email as leader_email
     from public.admin_collaboration_spaces s
     left join public.profiles leader on leader.id = s.leader_user_id
     where s.id = $1`,
    [spaceId]
  );
  const space = spaceResult.rows[0];
  if (!space) return null;

  const [memberResult, taskResult, subtaskResult] = await Promise.all([
    pool.query(
      `select m.*, m.created_at as member_created_at, p.display_name, p.email, p.admin_permissions
       from public.admin_collaboration_space_members m
       join public.profiles p on p.id = m.user_id
       where m.space_id = $1
       order by m.member_role desc, coalesce(p.display_name, p.email) asc`,
      [spaceId]
    ),
    pool.query(
      `select t.*, p.display_name as created_by_name, p.email as created_by_email
       from public.admin_collaboration_tasks t
       left join public.profiles p on p.id = t.created_by_user_id
       where t.space_id = $1
       order by coalesce(t.due_at, t.created_at) asc`,
      [spaceId]
    ),
    pool.query(
      `select st.*, p.display_name as assignee_name, p.email as assignee_email
       from public.admin_collaboration_subtasks st
       join public.admin_collaboration_tasks t on t.id = st.task_id
       left join public.profiles p on p.id = st.assignee_user_id
       where t.space_id = $1
       order by coalesce(st.due_at, st.created_at) asc`,
      [spaceId]
    )
  ]);

  const subtasksByTask = new Map();
  for (const row of subtaskResult.rows) {
    const subtask = mapSubtask(row);
    const list = subtasksByTask.get(subtask.taskId) || [];
    list.push(subtask);
    subtasksByTask.set(subtask.taskId, list);
  }

  const tasks = taskResult.rows.map((row) => mapTask(row, subtasksByTask.get(row.id) || []));
  return mapSpace(space, tasks, memberResult.rows.map(mapMember));
}

export async function getCollaborationTask(taskId, userId) {
  const { task, isLeader } = await assertTaskAccess(taskId, userId);
  const pool = getPostgresPool();
  const [spaceResult, memberResult, subtaskResult] = await Promise.all([
    pool.query(
      `select s.*, leader.display_name as leader_name, leader.email as leader_email
       from public.admin_collaboration_spaces s
       left join public.profiles leader on leader.id = s.leader_user_id
       where s.id = $1`,
      [task.space_id]
    ),
    pool.query(
      `select m.*, m.created_at as member_created_at, p.display_name, p.email, p.admin_permissions
       from public.admin_collaboration_space_members m
       join public.profiles p on p.id = m.user_id
       where m.space_id = $1
       order by m.member_role desc, coalesce(p.display_name, p.email) asc`,
      [task.space_id]
    ),
    pool.query(
      `select st.*, p.display_name as assignee_name, p.email as assignee_email
       from public.admin_collaboration_subtasks st
       left join public.profiles p on p.id = st.assignee_user_id
       where st.task_id = $1
       order by coalesce(st.due_at, st.created_at) asc`,
      [taskId]
    )
  ]);

  return {
    task: mapTask(task, subtaskResult.rows.map(mapSubtask)),
    space: mapSpace(spaceResult.rows[0], [], memberResult.rows.map(mapMember)),
    isLeader,
    isTaskCreator: task.created_by_user_id === userId,
    canCreateSubtask: isLeader || task.created_by_user_id === userId
  };
}

export async function getCollaborationSubtask(subtaskId, userId) {
  const context = await assertSubtaskAccess(subtaskId, userId);
  const pool = getPostgresPool();
  const [taskResult, spaceResult, updateResult] = await Promise.all([
    pool.query(
      `select t.*, p.display_name as created_by_name, p.email as created_by_email
       from public.admin_collaboration_tasks t
       left join public.profiles p on p.id = t.created_by_user_id
       where t.id = $1`,
      [context.subtask.task_id]
    ),
    pool.query(
      `select s.*, leader.display_name as leader_name, leader.email as leader_email
       from public.admin_collaboration_spaces s
       left join public.profiles leader on leader.id = s.leader_user_id
       where s.id = $1`,
      [context.subtask.space_id]
    ),
    pool.query(
      `select u.*, p.display_name as author_name, p.email as author_email
       from public.admin_collaboration_subtask_updates u
       left join public.profiles p on p.id = u.author_user_id
       where u.subtask_id = $1
       order by u.created_at desc`,
      [subtaskId]
    )
  ]);

  const subtask = mapSubtask(context.subtask);
  return {
    subtask: {
      ...subtask,
      taskTitle: context.subtask.task_title,
      spaceId: context.subtask.space_id,
      spaceName: context.subtask.space_name
    },
    task: mapTask(taskResult.rows[0], [subtask]),
    space: mapSpace(spaceResult.rows[0]),
    updates: updateResult.rows.map(mapSubtaskUpdate),
    permissions: {
      isLeader: context.isLeader,
      isAssignee: context.isAssignee,
      isTaskCreator: context.isTaskCreator,
      isSubtaskCreator: context.isSubtaskCreator,
      canUpdate: context.canUpdate
    }
  };
}

export async function listMyCollaborationSubtasks(userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select st.*, p.display_name as assignee_name, p.email as assignee_email,
      t.title as task_title, s.name as space_name, s.id as space_id
     from public.admin_collaboration_subtasks st
     join public.admin_collaboration_tasks t on t.id = st.task_id
     join public.admin_collaboration_spaces s on s.id = t.space_id
     left join public.profiles p on p.id = st.assignee_user_id
     where st.assignee_user_id = $1
       and st.status <> 'completed'
     order by coalesce(st.due_at, st.created_at) asc
     limit 20`,
    [userId]
  );
  return result.rows.map((row) => ({
    ...mapSubtask(row),
    taskTitle: row.task_title,
    spaceName: row.space_name,
    spaceId: row.space_id
  }));
}

export async function createCollaborationSpace(input, actor) {
  if (!canCreateCollaborationSpace(actor.profile)) {
    throw new Error("Administrator collaboration permission required.");
  }

  const name = clean(input.name);
  if (!name) throw new Error("Space name is required.");

  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `insert into public.admin_collaboration_spaces
        (name, description, leader_user_id, created_by_user_id)
       values ($1, $2, $3, $3)
       returning *`,
      [name, nullableText(input.description), actor.user.id]
    );
    const space = result.rows[0];
    await client.query(
      `insert into public.admin_collaboration_space_members
        (space_id, user_id, member_role, created_by_user_id)
       values ($1, $2, 'leader', $2)
       on conflict (space_id, user_id) do update set member_role = 'leader'`,
      [space.id, actor.user.id]
    );
    await client.query("commit");
    return mapSpace(space);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCollaborationSpace(spaceId, input, actorUserId) {
  await assertSpaceLeader(spaceId, actorUserId);
  const status = clean(input.status) || "active";
  if (!["active", "closed"].includes(status)) throw new Error("Invalid space status.");
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.admin_collaboration_spaces
     set name = $2,
      description = $3,
      status = $4,
      closed_at = case when $4 = 'closed' then coalesce(closed_at, now()) else null end,
      updated_at = now()
     where id = $1
     returning *`,
    [spaceId, clean(input.name), nullableText(input.description), status]
  );
  return mapSpace(result.rows[0]);
}

export async function addCollaborationMember(spaceId, memberUserId, actorUserId, locale = "zh-CN") {
  await assertSpaceLeader(spaceId, actorUserId);
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.admin_collaboration_space_members
      (space_id, user_id, member_role, created_by_user_id)
     values ($1, $2, 'member', $3)
     on conflict (space_id, user_id) do update set member_role = public.admin_collaboration_space_members.member_role
     returning *`,
    [spaceId, memberUserId, actorUserId]
  );
  const space = await getCollaborationSpace(spaceId, actorUserId);
  await createNotification({
    recipientUserId: memberUserId,
    eventType: NOTIFICATION_EVENTS.collaborationSpaceMemberAdded,
    title: "你已加入协作空间",
    body: `你已被加入协作空间：${space.name}`,
    relatedType: "collaboration_space",
    relatedId: spaceId,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/${locale}/admin/collaboration/spaces/${spaceId}/`
  });
  return result.rows[0];
}

export async function removeCollaborationMember(spaceId, memberUserId, actorUserId) {
  await assertSpaceLeader(spaceId, actorUserId);
  const pool = getPostgresPool();
  const result = await pool.query(
    `delete from public.admin_collaboration_space_members
     where space_id = $1 and user_id = $2 and member_role <> 'leader'
     returning *`,
    [spaceId, memberUserId]
  );
  return result.rowCount > 0;
}

export async function createCollaborationTask(spaceId, input, actorUserId) {
  await assertSpaceMember(spaceId, actorUserId);
  const title = clean(input.title);
  if (!title) throw new Error("Task title is required.");
  const taskType = normalizeTaskType(input.taskType);
  const repeatFrequency = normalizeRepeatFrequency(input.repeatFrequency, taskType);
  const dueAt = nullableDate(input.dueAt);
  const repeatLimit = taskType === "recurring" && Number(input.repeatLimit) > 0 ? Number(input.repeatLimit) : null;
  const nextRunAt = taskType === "recurring" ? nextRunFrom(dueAt || new Date().toISOString(), repeatFrequency) : null;

  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.admin_collaboration_tasks
      (space_id, title, description, due_at, task_type, repeat_frequency, repeat_limit, generated_count, next_run_at, created_by_user_id)
     values
      ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9)
     returning *`,
    [spaceId, title, nullableText(input.description), dueAt, taskType, repeatFrequency, repeatLimit, nextRunAt, actorUserId]
  );
  return mapTask(result.rows[0], []);
}

export async function updateCollaborationTask(taskId, input, actorUserId) {
  const { task, isLeader } = await assertTaskAccess(taskId, actorUserId);
  if (!isLeader && task.created_by_user_id !== actorUserId) {
    throw new Error("Only the leader or task creator can update this task.");
  }
  const title = clean(input.title);
  if (!title) throw new Error("Task title is required.");
  const isRecurringClosed = Boolean(input.isRecurringClosed);
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.admin_collaboration_tasks
     set title = $2,
      description = $3,
      due_at = $4,
      is_recurring_closed = $5,
      updated_at = now()
     where id = $1
     returning *`,
    [taskId, title, nullableText(input.description), nullableDate(input.dueAt), isRecurringClosed]
  );
  return mapTask(result.rows[0], []);
}

export async function createCollaborationSubtask(taskId, input, actorUserId, locale = "zh-CN") {
  const { task, isLeader } = await assertTaskAccess(taskId, actorUserId);
  if (!isLeader && task.created_by_user_id !== actorUserId) {
    throw new Error("Only the leader or task creator can add subtasks.");
  }

  const title = clean(input.title);
  if (!title) throw new Error("Subtask title is required.");
  const assigneeUserId = clean(input.assigneeUserId) || null;
  if (assigneeUserId) {
    await assertSpaceMember(task.space_id, assigneeUserId);
  }

  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.admin_collaboration_subtasks
      (task_id, title, description, assignee_user_id, due_at, created_by_user_id)
     values
      ($1, $2, $3, $4, $5, $6)
     returning *`,
    [taskId, title, nullableText(input.description), assigneeUserId, nullableDate(input.dueAt), actorUserId]
  );
  const subtask = mapSubtask(result.rows[0]);
  if (assigneeUserId) {
    await createNotification({
      recipientUserId: assigneeUserId,
      eventType: NOTIFICATION_EVENTS.collaborationSubtaskAssigned,
      title: "你有新的协作子任务",
      body: `子任务「${title}」已分配给你。`,
      relatedType: "collaboration_subtask",
      relatedId: subtask.id,
      metadata: { taskId },
      url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/${locale}/admin/collaboration/subtasks/${subtask.id}/`
    });
  }
  return subtask;
}

export async function updateCollaborationSubtask(subtaskId, input, actorUserId, locale = "zh-CN") {
  const { subtask, isLeader, isTaskCreator, isSubtaskCreator, canUpdate } = await assertSubtaskAccess(subtaskId, actorUserId);
  if (!canUpdate) {
    throw new Error("Only the leader, task creator, subtask creator, or assignee can update this subtask.");
  }

  const status = normalizeStatus(input.status);
  const canEditDetails = isLeader || isTaskCreator || isSubtaskCreator;
  const hasTitle = Object.prototype.hasOwnProperty.call(input, "title");
  const hasDescription = Object.prototype.hasOwnProperty.call(input, "description");
  const hasDueAt = Object.prototype.hasOwnProperty.call(input, "dueAt");
  const title = canEditDetails && hasTitle ? clean(input.title || subtask.title) : subtask.title;
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.admin_collaboration_subtasks
     set title = $2,
      description = $3,
      due_at = $4,
      status = $5,
      status_changed_at = case when status <> $5 then now() else status_changed_at end,
      updated_at = now()
     where id = $1
     returning *`,
    [
      subtaskId,
      title,
      canEditDetails && hasDescription ? nullableText(input.description) : subtask.description,
      canEditDetails && hasDueAt ? nullableDate(input.dueAt) : subtask.due_at,
      status
    ]
  );
  const updated = mapSubtask(result.rows[0]);
  if (updated.assigneeUserId && ["blocked", "completed"].includes(status)) {
    await createNotification({
      recipientUserId: updated.assigneeUserId,
      eventType: status === "blocked"
        ? NOTIFICATION_EVENTS.collaborationSubtaskBlocked
        : NOTIFICATION_EVENTS.collaborationSubtaskCompleted,
      title: status === "blocked" ? "协作子任务已受阻" : "协作子任务已完成",
      body: `子任务「${updated.title}」状态已更新。`,
      relatedType: "collaboration_subtask",
      relatedId: updated.id,
      metadata: { status },
      url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/${locale}/admin/collaboration/subtasks/${updated.id}/`
    });
  }
  return updated;
}

export async function createCollaborationSubtaskUpdate(subtaskId, input, actorUserId, locale = "zh-CN") {
  const context = await assertSubtaskAccess(subtaskId, actorUserId);
  if (!context.canUpdate) {
    throw new Error("Only the leader, task creator, subtask creator, or assignee can update this subtask.");
  }

  const message = clean(input.message);
  if (!message) throw new Error("Feedback is required.");
  const hasStatus = Object.prototype.hasOwnProperty.call(input, "status") && clean(input.status);
  const status = hasStatus ? normalizeStatus(input.status) : context.subtask.status;
  const previousStatus = context.subtask.status;

  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    let updatedSubtask = context.subtask;
    if (status !== previousStatus) {
      const result = await client.query(
        `update public.admin_collaboration_subtasks
         set status = $2,
          status_changed_at = now(),
          updated_at = now()
         where id = $1
         returning *`,
        [subtaskId, status]
      );
      updatedSubtask = result.rows[0];
    }

    const updateResult = await client.query(
      `insert into public.admin_collaboration_subtask_updates
        (subtask_id, author_user_id, previous_status, status, message)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [subtaskId, actorUserId, previousStatus, status, message]
    );
    await client.query("commit");

    const update = mapSubtaskUpdate(updateResult.rows[0]);
    const subtask = mapSubtask(updatedSubtask);
    if (subtask.assigneeUserId && ["blocked", "completed"].includes(status) && status !== previousStatus) {
      await createNotification({
        recipientUserId: subtask.assigneeUserId,
        eventType: status === "blocked"
          ? NOTIFICATION_EVENTS.collaborationSubtaskBlocked
          : NOTIFICATION_EVENTS.collaborationSubtaskCompleted,
        title: status === "blocked" ? "协作子任务已受阻" : "协作子任务已完成",
        body: `子任务「${subtask.title}」新增了过程反馈。`,
        relatedType: "collaboration_subtask",
        relatedId: subtask.id,
        metadata: { status },
        url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/${locale}/admin/collaboration/subtasks/${subtask.id}/`
      });
    }
    return { subtask, update };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function processCollaborationJobs(locale = "zh-CN") {
  const pool = getPostgresPool();
  const recurring = await pool.query(
    `select *
     from public.admin_collaboration_tasks
     where task_type = 'recurring'
       and is_recurring_closed = false
       and next_run_at is not null
       and next_run_at <= now()
       and (repeat_limit is null or generated_count < repeat_limit)
     order by next_run_at asc
     limit 20`
  );

  const generated = [];
  for (const template of recurring.rows) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const taskResult = await client.query(
        `insert into public.admin_collaboration_tasks
          (space_id, title, description, due_at, task_type, recurrence_template_id, created_by_user_id)
         values
          ($1, $2, $3, $4, 'one_time', $5, $6)
         returning *`,
        [template.space_id, template.title, template.description, template.next_run_at, template.id, template.created_by_user_id]
      );
      const newTask = taskResult.rows[0];
      const subtasks = await client.query(
        `select *
         from public.admin_collaboration_subtasks
         where task_id = $1
         order by created_at asc`,
        [template.id]
      );
      for (const subtask of subtasks.rows) {
        await client.query(
          `insert into public.admin_collaboration_subtasks
            (task_id, title, description, assignee_user_id, due_at, created_by_user_id)
           values
            ($1, $2, $3, $4, $5, $6)`,
          [newTask.id, subtask.title, subtask.description, subtask.assignee_user_id, template.next_run_at, template.created_by_user_id]
        );
      }
      const nextRunAt = nextRunFrom(template.next_run_at, template.repeat_frequency);
      await client.query(
        `update public.admin_collaboration_tasks
         set generated_count = generated_count + 1,
          next_run_at = $2,
          is_recurring_closed = case when repeat_limit is not null and generated_count + 1 >= repeat_limit then true else is_recurring_closed end,
          updated_at = now()
         where id = $1`,
        [template.id, nextRunAt]
      );
      await client.query("commit");
      generated.push(newTask.id);
      const members = await pool.query(
        `select user_id from public.admin_collaboration_space_members where space_id = $1`,
        [template.space_id]
      );
      for (const member of members.rows) {
        await createNotification({
          recipientUserId: member.user_id,
          eventType: NOTIFICATION_EVENTS.collaborationRecurringTaskCreated,
          title: "重复协作任务已生成",
          body: `重复任务「${template.title}」已生成新周期。`,
          relatedType: "collaboration_task",
          relatedId: newTask.id,
          url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/${locale}/admin/collaboration/spaces/${template.space_id}/`
        });
      }
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  const dueSoon = await pool.query(
    `update public.admin_collaboration_subtasks
     set due_soon_notified_at = now()
     where assignee_user_id is not null
       and status <> 'completed'
       and due_at is not null
       and due_at > now()
       and due_at <= now() + interval '24 hours'
       and due_soon_notified_at is null
     returning *`
  );
  for (const subtask of dueSoon.rows) {
    await createNotification({
      recipientUserId: subtask.assignee_user_id,
      eventType: NOTIFICATION_EVENTS.collaborationSubtaskDueSoon,
      title: "协作子任务即将到期",
      body: `子任务「${subtask.title}」将在 24 小时内到期。`,
      relatedType: "collaboration_subtask",
      relatedId: subtask.id
    });
  }

  const overdue = await pool.query(
    `update public.admin_collaboration_subtasks
     set overdue_notified_at = now()
     where assignee_user_id is not null
       and status <> 'completed'
       and due_at is not null
       and due_at < now()
       and overdue_notified_at is null
     returning *`
  );
  for (const subtask of overdue.rows) {
    await createNotification({
      recipientUserId: subtask.assignee_user_id,
      eventType: NOTIFICATION_EVENTS.collaborationSubtaskOverdue,
      title: "协作子任务已逾期",
      body: `子任务「${subtask.title}」已经超过截止日期。`,
      relatedType: "collaboration_subtask",
      relatedId: subtask.id
    });
  }

  return {
    generatedTaskIds: generated,
    dueSoonCount: dueSoon.rowCount,
    overdueCount: overdue.rowCount
  };
}
