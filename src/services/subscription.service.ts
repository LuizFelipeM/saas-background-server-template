import { type DatabaseManagerType, DITypes } from "@/lib/di.container/types";
import { Prisma } from "@/lib/generated/prisma";
import { inject, injectable } from "tsyringe";
import Stripe from "stripe";
import { AddonService } from "./addon.service";
import { FeatureService } from "./feature/feature.service";
import { PlanService } from "./plan.service";
import { SubscriptionStatus } from "@/lib/generated/prisma";

type StripeSubscription = Stripe.Subscription & {
  current_period_end: number;
};

@injectable()
export class SubscriptionService {
  private readonly subscriptionDelegate: Prisma.SubscriptionDelegate;

  constructor(
    @inject(DITypes.DatabaseManager)
    private readonly dbManager: DatabaseManagerType,
    @inject(DITypes.Stripe)
    private readonly stripe: Stripe,
    @inject(DITypes.PlanService)
    private readonly planService: PlanService,
    @inject(DITypes.AddonService)
    private readonly addonService: AddonService,
    @inject(DITypes.FeatureService)
    private readonly featureService: FeatureService
  ) {
    this.subscriptionDelegate = this.dbManager.client.subscription;
  }

  async completeSession(session: Stripe.Checkout.Session) {
    if (!session.metadata) {
      throw new Error("Missing metadata in checkout session");
    }

    const planId: string = session.metadata.planId;
    const addonIds: string[] = session.metadata.addonIds
      ? JSON.parse(session.metadata.addonIds)
      : [];
    const organizationId: string = session.metadata.organizationId;

    if (!planId || !organizationId) {
      throw new Error("Missing planId or organizationId in session metadata");
    }

    // Get subscription details
    const subscriptionId = session.subscription as string;
    const subscription = (await this.stripe.subscriptions.retrieve(
      subscriptionId
    )) as unknown as StripeSubscription;

    if (!subscription) {
      throw new Error("Failed to retrieve subscription");
    }

    const plan = await this.planService.getById(planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    const addons = await this.addonService.getAddonsById(addonIds);
    const features = this.featureService.generateSubscriptionFeatures(
      plan,
      addons
    );

    if (!features || (Array.isArray(features) && features.length === 0)) {
      throw new Error("Plan not found");
    }

    await this.subscriptionDelegate.create({
      data: {
        organizationId,
        planId,
        status: "TRIALING",
        stripeSubscriptionId: subscriptionId,
        features: JSON.stringify(features),
      },
    });
  }

  async invoicePaid(subscriptionId: string) {
    if (!subscriptionId) {
      throw new Error("No subscription ID found in invoice");
    }

    const subscription = (await this.stripe.subscriptions.retrieve(
      subscriptionId
    )) as unknown as StripeSubscription;

    if (!subscription) {
      throw new Error("Failed to retrieve subscription");
    }

    await this.subscriptionDelegate.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "ACTIVE",
      },
    });
  }

  async subscriptionUpdated(subscription: Stripe.Subscription) {
    if (!subscription.metadata) {
      throw new Error("Missing metadata in subscription");
    }

    const planId = subscription.metadata.planId;
    const companyId = subscription.metadata.companyId;

    if (!planId || !companyId) {
      throw new Error("Missing planId or companyId in subscription metadata");
    }

    const features = await this.planService.getFeatures(planId);

    if (!features || (Array.isArray(features) && features.length === 0)) {
      throw new Error("Plan not found");
    }

    await this.subscriptionDelegate.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        planId,
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        features,
      },
    });
  }

  async subscriptionDeleted(subscription: Stripe.Subscription) {
    await this.subscriptionDelegate.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "CANCELED",
      },
    });
  }

  // Configure an addon for a subscription
  // async configureAddon(input: ConfigureAddonInput): Promise<void> {
  //   const { subscriptionId, addonId, value } = input;

  //   // Check if the addon exists and is active
  //   const addon = await prisma.addon.findUnique({
  //     where: { id: addonId },
  //   });

  //   if (!addon || !addon.isActive) {
  //     throw new Error("Addon not found or inactive");
  //   }

  //   // Validate the value based on feature type
  //   this.validateAddonValue(addon, value);

  //   // Upsert the subscription addon
  //   await prisma.subscriptionAddon.upsert({
  //     where: {
  //       subscriptionId_addonId: {
  //         subscriptionId,
  //         addonId,
  //       },
  //     },
  //     create: {
  //       subscriptionId,
  //       addonId,
  //       value,
  //     },
  //     update: {
  //       value,
  //     },
  //   });
  // }

  // Remove an addon from a subscription
  // async removeAddonFromSubscription(
  //   subscriptionId: string,
  //   addonId: string
  // ): Promise<void> {
  //   await prisma.subscriptionAddon.delete({
  //     where: {
  //       subscriptionId_addonId: {
  //         subscriptionId,
  //         addonId,
  //       },
  //     },
  //   });
  // }

  // Get all addons for a subscription
  // async getSubscriptionAddons(subscriptionId: string) {
  //   return prisma.subscriptionAddon.findMany({
  //     where: { subscriptionId },
  //     include: { addon: true },
  //   });
  // }

  // Validate addon value based on feature type and metadata
  // private validateAddonValue(addon: Addon, value: AddonValue): void {
  //   const { featureType, metadata } = addon;

  //   switch (featureType) {
  //     case "DEFAULT":
  //       if (typeof value.enabled !== "boolean") {
  //         throw new Error(
  //           "DEFAULT type addons require an enabled boolean value"
  //         );
  //       }
  //       break;

  //     case "USAGE":
  //       if (typeof value.quantity !== "number") {
  //         throw new Error("USAGE type addons require a quantity number value");
  //       }
  //       if (metadata) {
  //         if (metadata.min !== undefined && value.quantity < metadata.min) {
  //           throw new Error(`Quantity must be at least ${metadata.min}`);
  //         }
  //         if (metadata.max !== undefined && value.quantity > metadata.max) {
  //           throw new Error(`Quantity must be at most ${metadata.max}`);
  //         }
  //         if (
  //           metadata.step !== undefined &&
  //           value.quantity % metadata.step !== 0
  //         ) {
  //           throw new Error(`Quantity must be a multiple of ${metadata.step}`);
  //         }
  //       }
  //       break;

  //     case "METERED":
  //       if (value.customValue === undefined) {
  //         throw new Error("METERED type addons require a customValue");
  //       }
  //       break;

  //     default:
  //       throw new Error(`Invalid feature type: ${featureType}`);
  //   }
  // }
}
