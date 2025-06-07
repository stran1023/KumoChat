/*
  Warnings:

  - You are about to drop the column `encryptedAESKey` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `plaintextForSender` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "encryptedAESKey",
DROP COLUMN "plaintextForSender";

-- CreateTable
CREATE TABLE "EncryptedAESKey" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aesKey" TEXT NOT NULL,

    CONSTRAINT "EncryptedAESKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EncryptedAESKey_messageId_userId_key" ON "EncryptedAESKey"("messageId", "userId");

-- AddForeignKey
ALTER TABLE "EncryptedAESKey" ADD CONSTRAINT "EncryptedAESKey_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncryptedAESKey" ADD CONSTRAINT "EncryptedAESKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
