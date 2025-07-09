import { AddonService } from "@/services/addon.service";
import { FeatureService } from "@/services/feature/feature.service";
import { PlanService } from "@/services/plan.service";
import { SubscriptionService } from "@/services/subscription.service";
import { DatabaseManager } from "@saas-packages/database-manager";
import { QueueManager } from "@saas-packages/queue-manager";
import { Redis } from "ioredis";
import Stripe from "stripe";

export const DITypes = {
  Stripe: "Stripe",
  DatabaseManager: "DatabaseManager",
  Redis: "Redis",
  QueueManager: "QueueManager",
  PlanService: "PlanService",
  AddonService: "AddonService",
  FeatureService: "FeatureService",
  SubscriptionService: "SubscriptionService",
} as const;

export type ServiceTypes = {
  [DITypes.Stripe]: Stripe;
  [DITypes.DatabaseManager]: DatabaseManager;
  [DITypes.Redis]: Redis;
  [DITypes.QueueManager]: QueueManager;
  [DITypes.PlanService]: PlanService;
  [DITypes.AddonService]: AddonService;
  [DITypes.FeatureService]: FeatureService;
  [DITypes.SubscriptionService]: SubscriptionService;
};
