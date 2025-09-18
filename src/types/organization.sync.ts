import { UserRole } from "@/lib/generated/prisma";

export enum OrganizationSyncType {
  SYNC = "sync",
  DELETE = "delete",
}

export interface OrganizationSyncJobData {
  type: OrganizationSyncType;
  organization: OrganizationSync;
}

export interface OrganizationSync {
  id: string;
  memberships: { userId: string; role: UserRole }[];
  createdAt: Date;
  updatedAt?: Date;
}
