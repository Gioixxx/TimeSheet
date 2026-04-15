-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "recurrence" TEXT,
    "recurrenceEnd" DATETIME,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Reminder_scheduledAt_idx" ON "Reminder"("scheduledAt");

-- CreateIndex
CREATE INDEX "Reminder_isCompleted_idx" ON "Reminder"("isCompleted");
