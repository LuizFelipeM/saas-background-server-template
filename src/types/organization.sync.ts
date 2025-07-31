import { UserRole } from "@/lib/generated/prisma";

export interface OrganizationSyncJobData {
  type: "sync" | "delete";
  organization: OrganizationSync;
}

export interface OrganizationSync {
  id: string;
  clerkId: string;
  memberships: { userId: string; role: UserRole }[];
  createdAt: Date;
  updatedAt?: Date;
}
