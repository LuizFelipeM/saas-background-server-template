import { AddonService } from "@/services/addon.service";
import { FeatureService } from "@/services/feature/feature.service";
import { PlanService } from "@/services/plan.service";
import { SubscriptionService } from "@/services/subscription.service";
import { UserService } from "@/services/user.service";
import { WebhookService } from "@/services/webhook/webhook.service";
import { DatabaseManager } from "@saas-packages/database-manager";
import { QueueManager } from '@saas-packages/queue-manager'
import { PrismaClient } from "@/lib/generated/prisma";
import { Redis } from "ioredis";
import Stripe from "stripe";
import { OrganizationService } from "@/services/organization.service";

export type DatabaseManagerType = DatabaseManager<PrismaClient>;

export const DITypes = {
  Stripe: "Stripe",
  DatabaseManager: "DatabaseManager",
  Redis: "Redis",
  QueueManager: "QueueManager",
  PlanService: "PlanService",
  AddonService: "AddonService",
  FeatureService: "FeatureService",
  SubscriptionService: "SubscriptionService",
  UserService: "UserService",
  OrganizationService: "OrganizationService",
  WebhookService: "WebhookService",
} as const;

export type ServiceTypes = {
  [DITypes.Stripe]: Stripe;
  [DITypes.DatabaseManager]: DatabaseManagerType;
  [DITypes.Redis]: Redis;
  [DITypes.QueueManager]: QueueManager;
  [DITypes.PlanService]: PlanService;
  [DITypes.AddonService]: AddonService;
  [DITypes.FeatureService]: FeatureService;
  [DITypes.SubscriptionService]: SubscriptionService;
  [DITypes.UserService]: UserService;
  [DITypes.OrganizationService]: OrganizationService;
  [DITypes.WebhookService]: WebhookService;
};
