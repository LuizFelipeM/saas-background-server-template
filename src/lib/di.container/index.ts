import { AddonService } from "@/services/addon.service";
import { FeatureService } from "@/services/feature/feature.service";
import { PlanService } from "@/services/plan.service";
import { SubscriptionService } from "@/services/subscription.service";
import { DatabaseManager } from "@saas-packages/database-manager";
import { QueueManager } from "@saas-packages/queue-manager";
import { container } from "tsyringe";
import { DITypes, ServiceTypes } from "./types";
import { PrismaClient } from "@/generated/prisma";
import Redis from "ioredis";

export class DIContainer {
  private static _container = container;

  public static initialize() {
    // Bind Prisma instance
    this._container.register(DITypes.DatabaseManager, {
      useValue: new DatabaseManager({
        prismaClient: new PrismaClient(),
        url: process.env.DATABASE_URL!,
        logQueries: true,
        logErrors: true,
      }),
    });

    // Bind Redis instance
    this._container.register(DITypes.Redis, {
      useValue: new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || "6379"),
        maxRetriesPerRequest: null,
      }),
    });

    // Bind QueueManager instance
    this._container.register(DITypes.QueueManager, {
      useFactory: (context) => {
        const redis = context.resolve<Redis>(DITypes.Redis);
        return new QueueManager({
          connection: redis,
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
          },
        });
      },
    });

    // Bind services
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
  }

  public static getInstance<T extends keyof ServiceTypes>(type: T) {
    return this._container.resolve<ServiceTypes[T]>(type) as ServiceTypes[T];
  }
}

DIContainer.initialize();
