import { type DatabaseManagerType, DITypes } from "@/lib/di.container/types";
import { type Prisma } from "@/lib/generated/prisma";
import { inject, injectable } from "tsyringe";

@injectable()
export class AddonService {
  private readonly addonDelegate: Prisma.AddonDelegate;

  constructor(
    @inject(DITypes.DatabaseManager)
    private readonly dbManager: DatabaseManagerType
  ) {
    this.addonDelegate = this.dbManager.client.addon;
  }

  async getAddonsById(ids: string[]) {
    return this.addonDelegate.findMany({
      where: { id: { in: ids } },
    });
  }

  async getAddonById(id: string) {
    return this.addonDelegate.findUnique({
      where: { id },
    });
  }

  async addonExists(stripeProductId: string) {
    const addon = await this.addonDelegate.findUnique({
      where: { stripeProductId },
      select: { id: true },
    });
    return !!addon;
  }
}
