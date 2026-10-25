CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "Email" character varying(254) NOT NULL,
        "DisplayName" character varying(80) NOT NULL,
        "PasswordHash" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "Language" text NOT NULL,
        "Theme" text NOT NULL,
        "Accent" text NOT NULL,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE TABLE "History" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "EventId" uuid NOT NULL,
        "TrackId" text NOT NULL,
        "Json" text NOT NULL,
        "Seconds" integer NOT NULL,
        "PlayedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_History" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_History_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE TABLE "LibraryItems" (
        "UserId" uuid NOT NULL,
        "Kind" text NOT NULL,
        "ItemId" text NOT NULL,
        "Json" text NOT NULL,
        "SavedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_LibraryItems" PRIMARY KEY ("UserId", "Kind", "ItemId"),
        CONSTRAINT "FK_LibraryItems_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE TABLE "Playlists" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Description" text NOT NULL,
        "Artwork" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Playlists" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Playlists_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE TABLE "RefreshTokens" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "Hash" text NOT NULL,
        "ExpiresAt" timestamp with time zone NOT NULL,
        "Revoked" boolean NOT NULL,
        "FamilyId" uuid NOT NULL,
        CONSTRAINT "PK_RefreshTokens" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_RefreshTokens_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE TABLE "Searches" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "Query" text NOT NULL,
        "SearchedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Searches" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Searches_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE TABLE "PlaylistTracks" (
        "PlaylistId" uuid NOT NULL,
        "TrackId" text NOT NULL,
        "Position" integer NOT NULL,
        "Json" text NOT NULL,
        CONSTRAINT "PK_PlaylistTracks" PRIMARY KEY ("PlaylistId", "TrackId"),
        CONSTRAINT "FK_PlaylistTracks_Playlists_PlaylistId" FOREIGN KEY ("PlaylistId") REFERENCES "Playlists" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_History_UserId_EventId" ON "History" ("UserId", "EventId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE INDEX "IX_History_UserId_PlayedAt" ON "History" ("UserId", "PlayedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE INDEX "IX_Playlists_UserId" ON "Playlists" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE INDEX "IX_PlaylistTracks_PlaylistId_Position" ON "PlaylistTracks" ("PlaylistId", "Position");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_RefreshTokens_Hash" ON "RefreshTokens" ("Hash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE INDEX "IX_RefreshTokens_UserId" ON "RefreshTokens" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Searches_UserId_Query" ON "Searches" ("UserId", "Query");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261025174154_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261025174154_InitialCreate', '8.0.22');
    END IF;
END $EF$;
COMMIT;

