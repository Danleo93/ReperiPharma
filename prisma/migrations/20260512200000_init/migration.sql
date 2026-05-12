-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CalendarStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'LOCAL', 'COMPANY', 'MANUAL');

-- CreateEnum
CREATE TYPE "ShiftFramework" AS ENUM ('WEEKDAY_AFTERNOON_ONCALL', 'SATURDAY_MORNING_ONCALL', 'DOUBLE_ONCALL_DAY_NIGHT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('WEEKDAY', 'SATURDAY', 'SUNDAY', 'NATIONAL_HOLIDAY', 'MANUAL_HOLIDAY', 'LOCAL_HOLIDAY', 'COMPANY_HOLIDAY');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('AFTERNOON', 'ON_CALL_WEEKDAY', 'SATURDAY_MORNING', 'ON_CALL_SATURDAY', 'ON_CALL_DAY', 'ON_CALL_NIGHT', 'MORNING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "HolidayScoreMode" AS ENUM ('SPLIT_BETWEEN_ON_CALL_SHIFTS');

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pharmacist" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#0f766e',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pharmacist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarYear" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" "CalendarStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "type" "HolidayType" NOT NULL,
    "siteId" TEXT,
    "defaultShiftFramework" "ShiftFramework" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarDay" (
    "id" TEXT NOT NULL,
    "calendarYearId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "dayType" "DayType" NOT NULL,
    "holidayId" TEXT,
    "shiftFramework" "ShiftFramework" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "calendarDayId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "pharmacistId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnCallRecord" (
    "id" TEXT NOT NULL,
    "calendarDayId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "pharmacistId" TEXT NOT NULL,
    "shiftAssignmentId" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "physician" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnCallRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "dayOnCallStartTime" TEXT NOT NULL DEFAULT '08:00',
    "dayOnCallEndTime" TEXT NOT NULL DEFAULT '20:00',
    "nightOnCallStartTime" TEXT NOT NULL DEFAULT '20:00',
    "nightOnCallEndTime" TEXT NOT NULL DEFAULT '08:00',
    "holidayScoreMode" "HolidayScoreMode" NOT NULL DEFAULT 'SPLIT_BETWEEN_ON_CALL_SHIFTS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- CreateIndex
CREATE INDEX "Pharmacist_lastName_firstName_idx" ON "Pharmacist"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "CalendarYear_status_idx" ON "CalendarYear"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarYear_year_siteId_key" ON "CalendarYear"("year", "siteId");

-- CreateIndex
CREATE INDEX "Holiday_date_type_idx" ON "Holiday"("date", "type");

-- CreateIndex
CREATE INDEX "Holiday_siteId_idx" ON "Holiday"("siteId");

-- CreateIndex
CREATE INDEX "CalendarDay_date_idx" ON "CalendarDay"("date");

-- CreateIndex
CREATE INDEX "CalendarDay_dayType_idx" ON "CalendarDay"("dayType");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDay_calendarYearId_date_key" ON "CalendarDay"("calendarYearId", "date");

-- CreateIndex
CREATE INDEX "ShiftAssignment_siteId_idx" ON "ShiftAssignment"("siteId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_pharmacistId_idx" ON "ShiftAssignment"("pharmacistId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAssignment_calendarDayId_shiftType_key" ON "ShiftAssignment"("calendarDayId", "shiftType");

-- CreateIndex
CREATE INDEX "OnCallRecord_siteId_idx" ON "OnCallRecord"("siteId");

-- CreateIndex
CREATE INDEX "OnCallRecord_pharmacistId_idx" ON "OnCallRecord"("pharmacistId");

-- CreateIndex
CREATE INDEX "OnCallRecord_calendarDayId_startTime_idx" ON "OnCallRecord"("calendarDayId", "startTime");

-- AddForeignKey
ALTER TABLE "CalendarYear" ADD CONSTRAINT "CalendarYear_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarDay" ADD CONSTRAINT "CalendarDay_calendarYearId_fkey" FOREIGN KEY ("calendarYearId") REFERENCES "CalendarYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarDay" ADD CONSTRAINT "CalendarDay_holidayId_fkey" FOREIGN KEY ("holidayId") REFERENCES "Holiday"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_calendarDayId_fkey" FOREIGN KEY ("calendarDayId") REFERENCES "CalendarDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "Pharmacist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallRecord" ADD CONSTRAINT "OnCallRecord_calendarDayId_fkey" FOREIGN KEY ("calendarDayId") REFERENCES "CalendarDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallRecord" ADD CONSTRAINT "OnCallRecord_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallRecord" ADD CONSTRAINT "OnCallRecord_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "Pharmacist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallRecord" ADD CONSTRAINT "OnCallRecord_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "ShiftAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
