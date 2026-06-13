// The prototype stores in-app notifications and simulated email logs in the
// database instead of sending real email. Keeping that logic here prevents route
// handlers and dashboard UI from duplicating notification queries.

import { Role } from "@prisma/client";

import { getDb } from "@/lib/db";

const reportReadyType = "REPORT_READY";
const districtReportType = "DISTRICT_REPORT_READY";

type ReportReadyObservation = {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  teacher: {
    id: string;
    email: string;
    name: string;
  };
  observer: {
    name: string;
  };
  school: {
    name: string;
  };
  districtId: string;
};

// DashboardShell calls this for the signed-in user so every protected app page
// can show a compact notification center.
export async function getNotificationCenter(userId: string) {
  const db = getDb();
  const [notifications, unreadCount, emailLogs] = await Promise.all([
    db.notification.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        observationId: true,
        readAt: true,
        title: true,
        type: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    }),
    db.notification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
    db.emailLog.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        createdAt: true,
        email: true,
        observationId: true,
        status: true,
        subject: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
    }),
  ]);

  return {
    emailLogs,
    notifications,
    unreadCount,
  };
}

// Upsert behavior without a schema-level unique constraint. If the notification
// already exists, refresh it and mark it unread again.
async function upsertNotification({
  body,
  observationId,
  title,
  type,
  userId,
}: {
  body: string;
  observationId: string;
  title: string;
  type: string;
  userId: string;
}) {
  const db = getDb();
  const existing = await db.notification.findFirst({
    where: {
      observationId,
      type,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return db.notification.update({
      where: {
        id: existing.id,
      },
      data: {
        body,
        readAt: null,
        title,
      },
    });
  }

  return db.notification.create({
    data: {
      body,
      observationId,
      title,
      type,
      userId,
    },
  });
}

// Avoid creating repeated simulated emails if a school admin edits a finalized
// report multiple times.
async function createEmailLogOnce({
  body,
  email,
  observationId,
  subject,
  userId,
}: {
  body: string;
  email: string;
  observationId: string;
  subject: string;
  userId: string;
}) {
  const db = getDb();
  const existing = await db.emailLog.findFirst({
    where: {
      observationId,
      subject,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (existing) return existing;

  return db.emailLog.create({
    data: {
      body,
      email,
      observationId,
      subject,
      userId,
    },
  });
}

// Load only the fields needed to notify teachers and district admins that a
// report is ready. This helper is called after report creation/finalization.
async function getReportReadyObservation(observationId: string) {
  return getDb().observation.findUnique({
    where: {
      id: observationId,
    },
    select: {
      id: true,
      title: true,
      subject: true,
      gradeLevel: true,
      districtId: true,
      teacher: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      observer: {
        select: {
          name: true,
        },
      },
      school: {
        select: {
          name: true,
        },
      },
    },
  });
}

// Report-ready notifications are emitted when a report reaches FINALIZED.
// Teachers get an in-app notification and a simulated email. District admins get
// an in-app notification so the district dashboard can surface report activity.
export async function sendReportReadyNotifications(observationId: string) {
  const observation = (await getReportReadyObservation(
    observationId
  )) as ReportReadyObservation | null;

  if (!observation) return;

  const teacherBody = `${observation.title} is ready with scoring, feedback, transcript evidence, and AI coaching details.`;
  const emailSubject = "Your observation report is ready";

  await Promise.all([
    upsertNotification({
      body: teacherBody,
      observationId: observation.id,
      title: "Observation report ready",
      type: reportReadyType,
      userId: observation.teacher.id,
    }),
    createEmailLogOnce({
      body: `${observation.observer.name} finalized your ${observation.subject} grade ${observation.gradeLevel} observation report for ${observation.school.name}.`,
      email: observation.teacher.email,
      observationId: observation.id,
      subject: emailSubject,
      userId: observation.teacher.id,
    }),
  ]);

  const districtAdmins = await getDb().user.findMany({
    where: {
      districtId: observation.districtId,
      role: Role.DISTRICT_ADMIN,
    },
    select: {
      id: true,
    },
  });

  await Promise.all(
    districtAdmins.map((admin) =>
      upsertNotification({
        body: `${observation.school.name} finalized ${observation.title} for ${observation.teacher.name}.`,
        observationId: observation.id,
        title: "New finalized observation",
        type: districtReportType,
        userId: admin.id,
      })
    )
  );
}
