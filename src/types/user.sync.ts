export enum UserSyncType {
  SYNC = "sync",
  DELETE = "delete",
}

export interface UserSyncJobData {
  type: UserSyncType;
  user: UserSync;
}

export interface UserSync {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  stripeId?: string | null;
  email: string;
}
