import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient;

  interface Window {
    convertOffice365File?: (file: File) => Promise<{
      url: string;
      filename: string;
      totalRecords: number;
      validRecords: number;
    }>;
  }
}
