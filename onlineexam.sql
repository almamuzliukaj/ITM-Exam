CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260403073935_InitialCreate') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "FullName" text NOT NULL,
        "Email" text NOT NULL,
        "PasswordHash" text NOT NULL,
        "Role" text NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260403073935_InitialCreate') THEN
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('17ef169c-c82d-44e3-8d24-e1fdc6ecf3be', TIMESTAMPTZ '2026-04-03T07:39:33.056324Z', 'prof@onlineexam.com', 'Professor', TRUE, 'Password123!', 'Professor');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('e0f054d5-d476-40d7-b57f-727165dc0e18', TIMESTAMPTZ '2026-04-03T07:39:33.056324Z', 'admin@onlineexam.com', 'Admin User', TRUE, 'Password123!', 'Admin');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('ea3f5ee5-638d-416c-9ef9-3f614007342e', TIMESTAMPTZ '2026-04-03T07:39:33.056324Z', 'student@onlineexam.com', 'Student', TRUE, 'Password123!', 'Student');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260403073935_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260403073935_InitialCreate', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406193718_Sprint2_ExamAndQuestion') THEN
    DELETE FROM "Users"
    WHERE "Id" = '17ef169c-c82d-44e3-8d24-e1fdc6ecf3be';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406193718_Sprint2_ExamAndQuestion') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'e0f054d5-d476-40d7-b57f-727165dc0e18';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406193718_Sprint2_ExamAndQuestion') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'ea3f5ee5-638d-416c-9ef9-3f614007342e';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406193718_Sprint2_ExamAndQuestion') THEN
    CREATE TABLE "Exams" (
        "Id" uuid NOT NULL,
        "Title" text NOT NULL,
        "Description" text NOT NULL,
        "OwnerId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Exams" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406193718_Sprint2_ExamAndQuestion') THEN
    CREATE TABLE "Questions" (
        "Id" uuid NOT NULL,
        "Text" text NOT NULL,
        "ExamId" uuid NOT NULL,
        CONSTRAINT "PK_Questions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Questions_Exams_ExamId" FOREIGN KEY ("ExamId") REFERENCES "Exams" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406193718_Sprint2_ExamAndQuestion') THEN
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('1e8c1a4e-ba02-4697-a771-2f2d1a6ee175', TIMESTAMPTZ '2026-04-06T19:37:14.748274Z', 'admin@onlineexam.com', 'Admin User', TRUE, 'Password123!', 'Admin');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('bd980cb2-6547-4bd4-b6a5-12b94c02a8e7', TIMESTAMPTZ '2026-04-06T19:37:14.748275Z', 'prof@onlineexam.com', 'Professor', TRUE, 'Password123!', 'Professor');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('fa9c9340-1789-4400-b225-0c1bfcfe5c71', TIMESTAMPTZ '2026-04-06T19:37:14.748277Z', 'student@onlineexam.com', 'Student', TRUE, 'Password123!', 'Student');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406193718_Sprint2_ExamAndQuestion') THEN
    CREATE INDEX "IX_Questions_ExamId" ON "Questions" ("ExamId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406193718_Sprint2_ExamAndQuestion') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260406193718_Sprint2_ExamAndQuestion', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    DELETE FROM "Users"
    WHERE "Id" = '1e8c1a4e-ba02-4697-a771-2f2d1a6ee175';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'bd980cb2-6547-4bd4-b6a5-12b94c02a8e7';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'fa9c9340-1789-4400-b225-0c1bfcfe5c71';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    ALTER TABLE "Exams" RENAME COLUMN "OwnerId" TO "CreatedByUserId";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    ALTER TABLE "Questions" ADD "ExamId1" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    ALTER TABLE "Exams" ADD "DurationMinutes" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    ALTER TABLE "Exams" ADD "EndsAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    ALTER TABLE "Exams" ADD "IsPublished" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    ALTER TABLE "Exams" ADD "StartsAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('1dd815c4-1535-449f-b20d-a4d78ac2546d', TIMESTAMPTZ '2026-04-06T21:40:38.846343Z', 'admin@onlineexam.com', 'Admin User', TRUE, 'Password123!', 'Admin');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('5facca79-cdfa-4c63-9c6c-937fb369610f', TIMESTAMPTZ '2026-04-06T21:40:38.846345Z', 'student@onlineexam.com', 'Student', TRUE, 'Password123!', 'Student');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('966ecb79-92f2-4122-bc76-c57d77b94c2b', TIMESTAMPTZ '2026-04-06T21:40:38.846345Z', 'prof@onlineexam.com', 'Professor', TRUE, 'Password123!', 'Professor');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    CREATE INDEX "IX_Questions_ExamId1" ON "Questions" ("ExamId1");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    ALTER TABLE "Questions" ADD CONSTRAINT "FK_Questions_Exams_ExamId1" FOREIGN KEY ("ExamId1") REFERENCES "Exams" ("Id");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260406214039_AddCreatedByUserIdToExam') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260406214039_AddCreatedByUserIdToExam', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409203634_FixQuestionForeignKey') THEN
    DELETE FROM "Users"
    WHERE "Id" = '1dd815c4-1535-449f-b20d-a4d78ac2546d';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409203634_FixQuestionForeignKey') THEN
    DELETE FROM "Users"
    WHERE "Id" = '5facca79-cdfa-4c63-9c6c-937fb369610f';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409203634_FixQuestionForeignKey') THEN
    DELETE FROM "Users"
    WHERE "Id" = '966ecb79-92f2-4122-bc76-c57d77b94c2b';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409203634_FixQuestionForeignKey') THEN
    ALTER TABLE "Questions" ADD "Points" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409203634_FixQuestionForeignKey') THEN
    ALTER TABLE "Questions" ADD "Type" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409203634_FixQuestionForeignKey') THEN
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('2111513c-e30b-4286-b2b8-7a2babfa3703', TIMESTAMPTZ '2026-04-09T20:36:33.828026Z', 'admin@onlineexam.com', 'Admin User', TRUE, 'Password123!', 'Admin');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('a120fe37-341f-4dde-90e6-122967fff74d', TIMESTAMPTZ '2026-04-09T20:36:33.828027Z', 'prof@onlineexam.com', 'Professor', TRUE, 'Password123!', 'Professor');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('eb1100da-64be-4eef-9b4a-e6aecc5e0502', TIMESTAMPTZ '2026-04-09T20:36:33.828027Z', 'student@onlineexam.com', 'Student', TRUE, 'Password123!', 'Student');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409203634_FixQuestionForeignKey') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260409203634_FixQuestionForeignKey', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409204120_RemoveShadowExamId1') THEN
    ALTER TABLE "Questions" DROP CONSTRAINT "FK_Questions_Exams_ExamId1";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409204120_RemoveShadowExamId1') THEN
    DROP INDEX "IX_Questions_ExamId1";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409204120_RemoveShadowExamId1') THEN
    DELETE FROM "Users"
    WHERE "Id" = '2111513c-e30b-4286-b2b8-7a2babfa3703';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409204120_RemoveShadowExamId1') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'a120fe37-341f-4dde-90e6-122967fff74d';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409204120_RemoveShadowExamId1') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'eb1100da-64be-4eef-9b4a-e6aecc5e0502';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409204120_RemoveShadowExamId1') THEN
    ALTER TABLE "Questions" DROP COLUMN "ExamId1";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409204120_RemoveShadowExamId1') THEN
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('72f91bcd-254b-4dfc-98cc-9dece7506cb8', TIMESTAMPTZ '2026-04-09T20:41:20.030466Z', 'prof@onlineexam.com', 'Professor', TRUE, 'Password123!', 'Professor');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('b17cb2e7-24c3-43ef-8cbe-9cadd3d05fc4', TIMESTAMPTZ '2026-04-09T20:41:20.030465Z', 'admin@onlineexam.com', 'Admin User', TRUE, 'Password123!', 'Admin');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('be5dc142-5672-481e-92bd-7ac772db21a1', TIMESTAMPTZ '2026-04-09T20:41:20.030466Z', 'student@onlineexam.com', 'Student', TRUE, 'Password123!', 'Student');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260409204120_RemoveShadowExamId1') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260409204120_RemoveShadowExamId1', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    DELETE FROM "Users"
    WHERE "Id" = '72f91bcd-254b-4dfc-98cc-9dece7506cb8';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'b17cb2e7-24c3-43ef-8cbe-9cadd3d05fc4';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'be5dc142-5672-481e-92bd-7ac772db21a1';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    CREATE TABLE "Courses" (
        "Id" uuid NOT NULL,
        "Code" text NOT NULL,
        "Name" text NOT NULL,
        CONSTRAINT "PK_Courses" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    CREATE TABLE "Terms" (
        "Id" uuid NOT NULL,
        "Season" text NOT NULL,
        "Year" integer NOT NULL,
        CONSTRAINT "PK_Terms" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    CREATE TABLE "CourseOfferings" (
        "Id" uuid NOT NULL,
        "CourseId" uuid NOT NULL,
        "TermId" uuid NOT NULL,
        "YearOfStudy" integer NOT NULL,
        "SemesterNo" integer NOT NULL,
        "ProfessorId" uuid NOT NULL,
        "AssistantId" uuid,
        CONSTRAINT "PK_CourseOfferings" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_CourseOfferings_Courses_CourseId" FOREIGN KEY ("CourseId") REFERENCES "Courses" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_CourseOfferings_Terms_TermId" FOREIGN KEY ("TermId") REFERENCES "Terms" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('59f80a88-fc46-4377-a4bf-700099bd37ba', TIMESTAMPTZ '2026-04-13T20:44:36.925142Z', 'prof@onlineexam.com', 'Professor', TRUE, 'Password123!', 'Professor');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('636391af-8eb5-43c4-946d-482b7f901604', TIMESTAMPTZ '2026-04-13T20:44:36.925142Z', 'student@onlineexam.com', 'Student', TRUE, 'Password123!', 'Student');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('ebe11f61-7c26-439f-8bdf-994c64844c96', TIMESTAMPTZ '2026-04-13T20:44:36.925141Z', 'admin@onlineexam.com', 'Admin User', TRUE, 'Password123!', 'Admin');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    CREATE INDEX "IX_CourseOfferings_CourseId" ON "CourseOfferings" ("CourseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    CREATE INDEX "IX_CourseOfferings_TermId" ON "CourseOfferings" ("TermId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260413204437_AddAcademicEntities') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260413204437_AddAcademicEntities', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    DELETE FROM "Users"
    WHERE "Id" = '59f80a88-fc46-4377-a4bf-700099bd37ba';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    DELETE FROM "Users"
    WHERE "Id" = '636391af-8eb5-43c4-946d-482b7f901604';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'ebe11f61-7c26-439f-8bdf-994c64844c96';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    ALTER TABLE "Questions" ADD "CorrectAnswer" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    ALTER TABLE "Questions" ADD "CourseId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    ALTER TABLE "Questions" ADD "Difficulty" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    ALTER TABLE "Exams" ADD "Status" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    CREATE TABLE "ExamAttempts" (
        "Id" uuid NOT NULL,
        "ExamId" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "SubmittedAt" timestamp with time zone NOT NULL,
        "AnswersJson" text NOT NULL,
        "Score" double precision NOT NULL,
        CONSTRAINT "PK_ExamAttempts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ExamAttempts_Exams_ExamId" FOREIGN KEY ("ExamId") REFERENCES "Exams" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ExamAttempts_Users_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1', TIMESTAMPTZ '2026-04-17T08:21:26.122054Z', 'student@onlineexam.com', 'Student', TRUE, 'Password123!', 'Student');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('b5769729-e575-4789-b6e7-f7327ede1acc', TIMESTAMPTZ '2026-04-17T08:21:26.122054Z', 'prof@onlineexam.com', 'Professor', TRUE, 'Password123!', 'Professor');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('f9635e15-1d90-4e3b-b722-331a8fc2fbe9', TIMESTAMPTZ '2026-04-17T08:21:26.122053Z', 'admin@onlineexam.com', 'Admin User', TRUE, 'Password123!', 'Admin');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    CREATE INDEX "IX_ExamAttempts_ExamId" ON "ExamAttempts" ("ExamId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    CREATE INDEX "IX_ExamAttempts_StudentId" ON "ExamAttempts" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417082126_AddExamStatus') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260417082126_AddExamStatus', '8.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" DROP CONSTRAINT "FK_CourseOfferings_Courses_CourseId";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" DROP CONSTRAINT "FK_CourseOfferings_Terms_TermId";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    DROP INDEX "IX_CourseOfferings_CourseId";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'b5769729-e575-4789-b6e7-f7327ede1acc';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    DELETE FROM "Users"
    WHERE "Id" = '4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    DELETE FROM "Users"
    WHERE "Id" = 'f9635e15-1d90-4e3b-b722-331a8fc2fbe9';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" DROP COLUMN "Year";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" RENAME COLUMN "ProfessorId" TO "PrimaryProfessorId";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ALTER COLUMN "Season" TYPE character varying(20);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ADD "AcademicYearLabel" character varying(20) NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ADD "Code" character varying(50) NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ADD "EndDate" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ADD "EnrollmentCloseAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ADD "EnrollmentOpenAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ADD "IsCurrent" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ADD "Name" character varying(100) NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ADD "StartDate" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Terms" ADD "Status" character varying(20) NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Exams" ADD "CourseOfferingId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Courses" ALTER COLUMN "Name" TYPE character varying(200);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Courses" ALTER COLUMN "Code" TYPE character varying(50);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Courses" ADD "Credits" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Courses" ADD "DefaultSemesterNo" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Courses" ADD "Description" character varying(1000) NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Courses" ADD "IsActive" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Courses" ADD "IsElective" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Courses" ADD "YearOfStudy" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" ADD "Capacity" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" ADD "CreatedAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" ADD "DeliveryType" character varying(20) NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" ADD "SectionCode" character varying(50) NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" ADD "Status" character varying(20) NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" ADD "UpdatedAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE TABLE "CarryOverCourses" (
        "Id" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "CourseId" uuid NOT NULL,
        "OriginTermId" uuid NOT NULL,
        "OriginSemesterNo" integer NOT NULL,
        "Reason" character varying(20) NOT NULL,
        "SourceResultId" uuid,
        "Status" character varying(20) NOT NULL,
        "ResolvedByPassingOfferingId" uuid,
        "CreatedAt" timestamp with time zone NOT NULL,
        "ClosedAt" timestamp with time zone,
        CONSTRAINT "PK_CarryOverCourses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_CarryOverCourses_Courses_CourseId" FOREIGN KEY ("CourseId") REFERENCES "Courses" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_CarryOverCourses_Terms_OriginTermId" FOREIGN KEY ("OriginTermId") REFERENCES "Terms" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE TABLE "CourseOfferingStaffAssignments" (
        "Id" uuid NOT NULL,
        "CourseOfferingId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "RoleInOffering" character varying(20) NOT NULL,
        "AssignmentType" character varying(20) NOT NULL,
        "PermissionsProfile" character varying(30) NOT NULL,
        "AssignedAt" timestamp with time zone NOT NULL,
        "AssignedBy" uuid NOT NULL,
        "RevokedAt" timestamp with time zone,
        "RevokedBy" uuid,
        "IsActive" boolean NOT NULL,
        CONSTRAINT "PK_CourseOfferingStaffAssignments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_CourseOfferingStaffAssignments_CourseOfferings_CourseOfferi~" FOREIGN KEY ("CourseOfferingId") REFERENCES "CourseOfferings" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE TABLE "SemesterEnrollments" (
        "Id" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "TermId" uuid NOT NULL,
        "YearOfStudy" integer NOT NULL,
        "SemesterNo" integer NOT NULL,
        "Status" character varying(20) NOT NULL,
        "EnrolledAt" timestamp with time zone NOT NULL,
        "ApprovedBy" uuid,
        "Notes" character varying(1000) NOT NULL,
        CONSTRAINT "PK_SemesterEnrollments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SemesterEnrollments_Terms_TermId" FOREIGN KEY ("TermId") REFERENCES "Terms" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE TABLE "StudentCourseEnrollments" (
        "Id" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "CourseOfferingId" uuid NOT NULL,
        "LinkedSemesterEnrollmentId" uuid,
        "EnrollmentSource" character varying(30) NOT NULL,
        "Status" character varying(20) NOT NULL,
        "EligibleForExam" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "CreatedBy" uuid NOT NULL,
        CONSTRAINT "PK_StudentCourseEnrollments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StudentCourseEnrollments_CourseOfferings_CourseOfferingId" FOREIGN KEY ("CourseOfferingId") REFERENCES "CourseOfferings" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_StudentCourseEnrollments_SemesterEnrollments_LinkedSemester~" FOREIGN KEY ("LinkedSemesterEnrollmentId") REFERENCES "SemesterEnrollments" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1', TIMESTAMPTZ '2026-04-17T08:21:26.122054Z', 'student@onlineexam.com', 'Student', TRUE, 'Password123!', 'Student');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('b5769729-e575-4789-b6e7-f7327ede1acc', TIMESTAMPTZ '2026-04-17T08:21:26.122054Z', 'prof@onlineexam.com', 'Professor', TRUE, 'Password123!', 'Professor');
    INSERT INTO "Users" ("Id", "CreatedAt", "Email", "FullName", "IsActive", "PasswordHash", "Role")
    VALUES ('f9635e15-1d90-4e3b-b722-331a8fc2fbe9', TIMESTAMPTZ '2026-04-17T08:21:26.122053Z', 'admin@onlineexam.com', 'Admin User', TRUE, 'Password123!', 'Admin');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE UNIQUE INDEX "IX_Terms_Code" ON "Terms" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE INDEX "IX_Exams_CourseOfferingId" ON "Exams" ("CourseOfferingId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE UNIQUE INDEX "IX_Courses_Code" ON "Courses" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE UNIQUE INDEX "IX_CourseOfferings_CourseId_TermId_SectionCode" ON "CourseOfferings" ("CourseId", "TermId", "SectionCode");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE INDEX "IX_CarryOverCourses_CourseId" ON "CarryOverCourses" ("CourseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE INDEX "IX_CarryOverCourses_OriginTermId" ON "CarryOverCourses" ("OriginTermId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE INDEX "IX_CourseOfferingStaffAssignments_CourseOfferingId" ON "CourseOfferingStaffAssignments" ("CourseOfferingId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE INDEX "IX_SemesterEnrollments_TermId" ON "SemesterEnrollments" ("TermId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE INDEX "IX_StudentCourseEnrollments_CourseOfferingId" ON "StudentCourseEnrollments" ("CourseOfferingId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE INDEX "IX_StudentCourseEnrollments_LinkedSemesterEnrollmentId" ON "StudentCourseEnrollments" ("LinkedSemesterEnrollmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    CREATE UNIQUE INDEX "IX_StudentCourseEnrollments_StudentId_CourseOfferingId" ON "StudentCourseEnrollments" ("StudentId", "CourseOfferingId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" ADD CONSTRAINT "FK_CourseOfferings_Courses_CourseId" FOREIGN KEY ("CourseId") REFERENCES "Courses" ("Id") ON DELETE RESTRICT;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "CourseOfferings" ADD CONSTRAINT "FK_CourseOfferings_Terms_TermId" FOREIGN KEY ("TermId") REFERENCES "Terms" ("Id") ON DELETE RESTRICT;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    ALTER TABLE "Exams" ADD CONSTRAINT "FK_Exams_CourseOfferings_CourseOfferingId" FOREIGN KEY ("CourseOfferingId") REFERENCES "CourseOfferings" ("Id") ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260417093725_ImplementAcademicStructure') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260417093725_ImplementAcademicStructure', '8.0.0');
    END IF;
END $EF$;
COMMIT;

