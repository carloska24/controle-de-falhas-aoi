-- Tokens emitidos antes desta mudança não têm versão e exigem novo login.
ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
