export interface UserSyncJobData {
  type: "sync" | "delete";
  user: UserSync;
}

export interface UserSync {
  id: string;
  clerkId: string;
  createdAt: Date;
  updatedAt?: Date;
  stripeId?: string | null;
  email: string;
}
