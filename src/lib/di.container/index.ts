import { AddonService } from "@/services/addon.service";
import { FeatureService } from "@/services/feature/feature.service";
import { OrganizationService } from "@/services/organization.service";
import { PlanService } from "@/services/plan.service";
import { SubscriptionService } from "@/services/subscription.service";
import { UserService } from "@/services/user.service";
import { WebhookService } from "@/services/webhook/webhook.service";
import { DatabaseManager } from "@saas-packages/database-manager";
import { QueueManager } from "@saas-packages/queue-manager";
import { container } from "tsyringe";
import { DITypes, ServiceTypes } from "./types";
import { PrismaClient } from "@/lib/generated/prisma";
import Redis from "ioredis";
import Stripe from "stripe";

export class DIContainer {
  private static _container = container;
  private static _singletonInstances: {
    [key in keyof ServiceTypes]?: ServiceTypes[key];
  } = {};

  public static initialize() {
    this.registerSingletonInstances();
    this.registerServices();
  }

  private static registerSingletonInstances() {
    this._container.register(DITypes.Redis, {
      useValue: new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || "6379"),
        maxRetriesPerRequest: null,
      }),
    });

    this._container.register(DITypes.Stripe, {
      useValue: new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-06-30.basil",
      }),
    });

    this._container.register(DITypes.DatabaseManager, {
      useValue: new DatabaseManager({
        prismaClient: new PrismaClient(),
      }),
    });

    this._container.register(DITypes.QueueManager, {
      useFactory: (context) => {
        const redis = context.resolve<Redis>(DITypes.Redis);
        if (!this._singletonInstances[DITypes.QueueManager]) {
          this._singletonInstances[DITypes.QueueManager] = new QueueManager({
            connection: redis,
            prefix: "bull:",
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 1000,
              },
            },
          });
        }
        return this._singletonInstances[DITypes.QueueManager];
      },
    });
  }

  private static registerServices() {
    this._container.register(DITypes.PlanService, {
      useClass: PlanService,
    });
    this._container.register(DITypes.AddonService, {
      useClass: AddonService,
    });
    this._container.register(DITypes.FeatureService, {
      useClass: FeatureService,
    });
    this._container.register(DITypes.SubscriptionService, {
      useClass: SubscriptionService,
    });
    this._container.register(DITypes.UserService, {
      useClass: UserService,
    });
    this._container.register(DITypes.OrganizationService, {
      useClass: OrganizationService,
    });
    this._container.register(DITypes.WebhookService, {
      useClass: WebhookService,
    });
  }

  public static getInstance<T extends keyof ServiceTypes>(type: T) {
    return this._container.resolve<ServiceTypes[T]>(type) as ServiceTypes[T];
  }
}

DIContainer.initialize();
