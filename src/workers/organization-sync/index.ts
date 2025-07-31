import { DIContainer } from "@/lib/di.container";
import { DITypes } from "@/lib/di.container/types";
import { UserRole } from "@/lib/generated/prisma";
import { OrganizationSyncJobData } from "@/types/organization.sync";
import { JobProcessor, JobResult } from "@saas-packages/queue-manager";
import { Job } from "bullmq";
import z from "zod";

export default class OrganizationSyncJob
  implements JobProcessor<OrganizationSyncJobData>
{
  private readonly jobDataSchema = z.object({
    type: z.enum(["sync", "delete"]),
    organization: z.object({
      id: z.string(),
      clerkId: z.string(),
      memberships: z.array(
        z.object({
          userId: z.string(),
          role: z.enum(UserRole),
        })
      ),
      createdAt: z.string().transform((str) => new Date(str)),
      updatedAt: z.string().optional().transform((str) => (str ? new Date(str) : undefined)),
    }),
  });

  async process(job: Job<OrganizationSyncJobData>): Promise<JobResult> {
    try {
      job.log(
        `Processing organization sync job: ${JSON.stringify(job.data, null, 2)}`
      );

      const { type, organization } = this.jobDataSchema.parse(job.data);
      const organizationService = DIContainer.getInstance(
        DITypes.OrganizationService
      );

      switch (type) {
        case "sync": {
          job.log(
            `Syncing organization with id: ${organization.id} and clerkId: ${organization.clerkId}`
          );
          await organizationService.sync(organization);
          job.log(
            `Successfully synced organization with id: ${organization.id} and clerkId: ${organization.clerkId}`
          );

          return {
            success: true,
          };
        }

        case "delete": {
          job.log(
            `Deleting organization with id: ${organization.id}`
          );
          await organizationService.delete(organization.id);
          job.log(
            `Successfully deleted organization with id: ${organization.id}`
          );

          return {
            success: true,
          };
        }

        default: {
          throw new Error(
            `Unknown organization sync type ${type} for organization with id: ${organization.id} and clerkId: ${organization.clerkId}`
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      job.log(`Error processing organization sync job: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
