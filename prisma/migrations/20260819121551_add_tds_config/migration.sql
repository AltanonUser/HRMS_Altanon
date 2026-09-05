/*
  Warnings:

  - Added the required column `tdsConfigJson` to the `StatutoryConfig` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StatutoryConfig" ADD COLUMN     "tdsConfigJson" JSONB NOT NULL;
