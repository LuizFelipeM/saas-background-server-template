import { DITypes } from "@/lib/di.container/types";
import { DatabaseManager } from "@saas-packages/database-manager";
import { inject, injectable } from "tsyringe";

@injectable()
export class PlanService {
  constructor(
    @inject(DITypes.DatabaseManager)
    private readonly dbManager: DatabaseManager
  ) {
    this.dbManager.connect();
  }

  async getFeatures(planId: string) {
    const plan = await this.dbManager.getClient().plan.findUnique({
      select: { features: true },
      where: { id: planId },
    });
    return plan?.features;
  }

  async getById(planId: string) {
    return this.dbManager.getClient().plan.findUnique({
      where: { id: planId },
    });
  }

  async getActivePlanById(planId: string) {
    return this.dbManager.getClient().plan.findUnique({
      where: { id: planId, isActive: true },
    });
  }

  async planExists(stripeProductId: string) {
    const plan = await this.dbManager.getClient().plan.findUnique({
      where: { stripeProductId },
      select: { id: true },
    });
    return !!plan;
  }
}
