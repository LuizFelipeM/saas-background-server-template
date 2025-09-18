/*
  Warnings:

  - You are about to drop the column `clerkId` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `clerkId` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "organizations_clerkId_key";

-- DropIndex
DROP INDEX "users_clerkId_key";

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "clerkId";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "clerkId";
