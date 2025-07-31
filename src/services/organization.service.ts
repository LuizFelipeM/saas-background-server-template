import { type DatabaseManagerType, DITypes } from "@/lib/di.container/types";
import { Prisma, Organization } from "@/lib/generated/prisma";
import { OrganizationSync } from "@/types/organization.sync";
import { inject, injectable } from "tsyringe";

@injectable()
export class OrganizationService {
  private readonly organizationDelegate: Prisma.OrganizationDelegate;

  constructor(
    @inject(DITypes.DatabaseManager)
    private readonly dbManager: DatabaseManagerType
  ) {
    this.organizationDelegate = this.dbManager.client.organization;
  }

  async getById(id: string): Promise<Organization | null> {
    return await this.organizationDelegate.findUnique({
      where: { id },
    });
  }

  async getByClerkId(clerkId: string): Promise<Organization | null> {
    return await this.organizationDelegate.findUnique({
      where: { clerkId },
    });
  }

  async sync(organization: OrganizationSync): Promise<Organization> {
    return await this.organizationDelegate.upsert({
      where: { clerkId: organization.clerkId },
      update: {
        id: organization.id,
        clerkId: organization.clerkId,
        memberships: {
          deleteMany: {
            OR: organization.memberships.map((membership) => ({
              organizationId: organization.id,
              userId: membership.userId,
            })),
          },
          createMany: {
            data: organization.memberships.map((membership) => ({
              userId: membership.userId,
              role: membership.role,
            })),
          },
        },
        createdAt: organization.createdAt,
        updatedAt: new Date(),
      },
      create: {
        id: organization.id,
        clerkId: organization.clerkId,
        memberships: {
          createMany: {
            data: organization.memberships.map((membership) => ({
              userId: membership.userId,
              role: membership.role,
            })),
          },
        },
        createdAt: organization.createdAt,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.organizationDelegate.delete({
      where: { id },
    });
  }

  async exists(clerkId: string): Promise<boolean> {
    const organization = await this.organizationDelegate.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    return !!organization;
  }
}
