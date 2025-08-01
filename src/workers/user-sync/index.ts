import { DIContainer } from "@/lib/di.container";
import { DITypes } from "@/lib/di.container/types";
import { UserSyncJobData } from "@/types/user.sync";
import { JobProcessor, JobResult } from "@saas-packages/queue-manager";
import { Job } from "bullmq";
import z from "zod";

export default class UserSyncJob implements JobProcessor<UserSyncJobData> {
  private readonly jobDataSchema = z.object({
    type: z.enum(["sync", "delete"]),
    user: z.object({
      id: z.string(),
      email: z.string(),
      clerkId: z.string(),
      stripeId: z.string().optional(),
      createdAt: z.string().transform((str) => new Date(str)),
      updatedAt: z
        .string()
        .optional()
        .transform((str) => (str ? new Date(str) : undefined)),
    }),
  });

  async process(job: Job<UserSyncJobData>): Promise<JobResult> {
    try {
      job.log(`Processing user sync job: ${JSON.stringify(job.data, null, 2)}`);

      const { type, user } = this.jobDataSchema.parse(job.data);
      const userService = DIContainer.getInstance(DITypes.UserService);

      switch (type) {
        case "sync": {
          if (!user) {
            throw new Error("user is required for sync action");
          }

          job.log(
            `Syncing user with id: ${user.id} and clerkId: ${user.clerkId}`
          );
          await userService.sync(user);
          job.log(
            `Successfully synced user with id: ${user.id} and clerkId: ${user.clerkId}`
          );

          return {
            success: true,
          };
        }

        case "delete": {
          job.log(
            `Deleting user with id: ${user.id} and clerkId: ${user.clerkId}`
          );
          await userService.delete(user.clerkId);
          job.log(
            `Successfully deleted user with id: ${user.id} and clerkId: ${user.clerkId}`
          );

          return {
            success: true,
          };
        }

        default: {
          throw new Error(
            `Unknown user sync type ${type} for user with id: ${user.id} and clerkId: ${user.clerkId}`
          );
        }
      }
    } catch (error) {
      job.log(
        `Error processing user sync job: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
