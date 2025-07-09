import { DITypes } from "@/lib/di.container/types";
import { DatabaseManager } from "@saas-packages/database-manager";
import { inject, injectable } from "tsyringe";

@injectable()
export class AddonService {
  constructor(
    @inject(DITypes.DatabaseManager)
    private readonly dbManager: DatabaseManager
  ) {}

  async getAddonsById(ids: string[]) {
    return this.dbManager.getClient().addon.findMany({
      where: { id: { in: ids } },
    });
  }

  async getAddonById(id: string) {
    return this.dbManager.getClient().addon.findUnique({
      where: { id },
    });
  }

  async addonExists(stripeProductId: string) {
    const addon = await this.dbManager.getClient().addon.findUnique({
      where: { stripeProductId },
      select: { id: true },
    });
    return !!addon;
  }
}
