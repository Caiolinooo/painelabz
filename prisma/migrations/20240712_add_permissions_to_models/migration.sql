-- AlterTable: Add permission fields to Card model
ALTER TABLE "Card" ADD COLUMN "adminOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Card" ADD COLUMN "managerOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Card" ADD COLUMN "allowedRoles" JSONB;
ALTER TABLE "Card" ADD COLUMN "allowedUserIds" JSONB;

-- AlterTable: Add permission fields to MenuItem model
ALTER TABLE "MenuItem" ADD COLUMN "managerOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN "allowedRoles" JSONB;
ALTER TABLE "MenuItem" ADD COLUMN "allowedUserIds" JSONB;

-- AlterTable: Add permission fields to Document model
ALTER TABLE "Document" ADD COLUMN "adminOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ADD COLUMN "managerOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ADD COLUMN "allowedRoles" JSONB;
ALTER TABLE "Document" ADD COLUMN "allowedUserIds" JSONB;

-- AlterTable: Update News model
ALTER TABLE "News" ADD COLUMN "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "News" ADD COLUMN "coverImage" TEXT;
ALTER TABLE "News" ADD COLUMN "tags" JSONB;
ALTER TABLE "News" ADD COLUMN "adminOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "News" ADD COLUMN "managerOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "News" ADD COLUMN "allowedRoles" JSONB;
ALTER TABLE "News" ADD COLUMN "allowedUserIds" JSONB;
ALTER TABLE "News" ALTER COLUMN "file" DROP NOT NULL;
