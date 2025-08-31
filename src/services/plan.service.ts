import { type DatabaseManagerType, DITypes } from "@/lib/di.container/types";
import { Prisma } from "@/lib/generated/prisma";
import { inject, injectable } from "tsyringe";

@injectable()
export class PlanService {
  private readonly planDelegate: Prisma.PlanDelegate;

  constructor(
    @inject(DITypes.DatabaseManager)
    private readonly dbManager: DatabaseManagerType
  ) {
    this.planDelegate = this.dbManager.client.plan;
  }

  async getFeatures(planId: string) {
    const plan = await this.planDelegate.findUnique({
      select: { features: true },
      where: { id: planId },
    });
    return plan?.features;
  }

  async getById(planId: string) {
    return this.planDelegate.findUnique({
      where: { id: planId },
    });
  }

  async getByName(planName: string) {
    return this.planDelegate.findFirst({
      where: { name: planName },
    });
  }

  async getActivePlanById(planId: string) {
    return this.planDelegate.findUnique({
      where: { id: planId, isActive: true },
    });
  }

  async planExists(stripeProductId: string) {
    const plan = await this.planDelegate.findUnique({
      where: { stripeProductId },
      select: { id: true },
    });
    return !!plan;
  }
}
