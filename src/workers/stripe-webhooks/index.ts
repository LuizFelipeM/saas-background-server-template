import { DIContainer } from "@/lib/di.container";
import { DITypes } from "@/lib/di.container/types";
import { JobProcessor, JobResult } from "@saas-packages/queue-manager";
import { Job } from "bullmq";
import Stripe from "stripe";

type StripeInvoice = Stripe.Invoice & {
  subscription: string;
};

export default class StripeWebhookJob implements JobProcessor<Stripe.Event> {
  async process(job: Job<Stripe.Event>): Promise<JobResult> {
    job.log(`Processing stripe event: ${JSON.stringify(job.data, null, 2)}`);

    const event = job.data;
    const eventType = event.type;
    const subscriptionId = (event.data.object as { subscription: string })
      .subscription;

    if (!subscriptionId) {
      job.log(
        `Skipping event with no subscription ID ${JSON.stringify(
          event,
          null,
          2
        )}`
      );
      throw new Error("Subscription ID is required");
    }

    const redis = DIContainer.getInstance(DITypes.Redis);
    const stateKey = `stripe:state:${subscriptionId}`;
    const currentState = (await redis.get(stateKey)) || "waiting_checkout";

    const subscriptionService = DIContainer.getInstance(
      DITypes.SubscriptionService
    );

    switch (eventType) {
      case "checkout.session.completed": {
        if (currentState !== "waiting_checkout") {
          job.log("Already processed checkout, skipping...");
          return {
            success: false,
            error: "Already processed checkout",
          };
        }

        job.log(`Processing ${eventType}`);

        const session = event.data.object;
        await subscriptionService.completeSession(session);

        await redis.set(stateKey, "checkout_done");
        return {
          success: true,
        };
      }

      case "invoice.paid": {
        if (currentState !== "checkout_done") {
          job.log("invoice.paid arrived too early. Rescheduling...");
          return {
            success: true,
            moveToDelay: {
              delay: 5000,
            },
          };
        }

        job.log(`Processing ${eventType}`);

        const invoice = event.data.object as StripeInvoice;
        const subscriptionId = invoice.subscription;
        await subscriptionService.invoicePaid(subscriptionId);

        await redis.set(stateKey, "invoice_paid");
        return {
          success: true,
        };
      }

      case "customer.subscription.updated": {
        job.log(`Processing ${eventType}`);

        const subscription = event.data.object;
        await subscriptionService.subscriptionUpdated(subscription);

        await redis.set(stateKey, "done");
        return {
          success: true,
        };
      }

      case "customer.subscription.deleted": {
        job.log(`Processing ${eventType}`);

        const subscription = event.data.object;
        await subscriptionService.subscriptionDeleted(subscription);
        await redis.set(stateKey, "done");
        return {
          success: true,
        };
      }

      default: {
        job.log(`Event ${eventType} not supported`);
        return {
          success: true,
        };
      }
    }
  }
}

// export default async (job: Job, token?: string) => {
//   job.log(`Processing stripe event: ${JSON.stringify(job.data, null, 2)}`);

//   const event = job.data;
//   const eventType = event.type;
//   const subscriptionId = event.data.object.subscription;

//   if (!subscriptionId) {
//     job.log(
//       `Skipping event with no subscription ID ${JSON.stringify(event, null, 2)}`
//     );
//     throw new Error("Subscription ID is required");
//   }

//   const redis = DIContainer.getInstance(DITypes.Redis);
//   const stateKey = `stripe:state:${subscriptionId}`;
//   const currentState = (await redis.get(stateKey)) || "waiting_checkout";

//   const subscriptionService = DIContainer.getInstance(
//     DITypes.SubscriptionService
//   );

//   switch (eventType) {
//     case "checkout.session.completed": {
//       if (currentState !== "waiting_checkout") {
//         job.log("Already processed checkout, skipping...");
//         throw new Error("Already processed checkout");
//       }

//       job.log(`Processing ${eventType}`);

//       const session = event.data.object;
//       await subscriptionService.completeSession(session);

//       await redis.set(stateKey, "checkout_done");
//       break;
//     }

//     case "invoice.paid": {
//       if (currentState !== "checkout_done") {
//         // Retry later
//         job.log("invoice.paid arrived too early. Rescheduling...");
//         await job.moveToDelayed(Date.now() + 5000, token);
//         throw new DelayedError();
//       }

//       job.log(`Processing ${eventType}`);

//       const invoice = event.data.object as StripeInvoice;
//       const subscriptionId = invoice.subscription;
//       await subscriptionService.invoicePaid(subscriptionId);

//       await redis.set(stateKey, "invoice_paid");
//       break;
//     }

//     case "customer.subscription.updated": {
//       job.log(`Processing ${eventType}`);

//       const subscription = event.data.object;
//       await subscriptionService.subscriptionUpdated(subscription);

//       await redis.set(stateKey, "done");
//       break;
//     }

//     case "customer.subscription.deleted": {
//       job.log(`Processing ${eventType}`);

//       const subscription = event.data.object;
//       await subscriptionService.subscriptionDeleted(subscription);
//       await redis.set(stateKey, "done");
//       break;
//     }

//     default: {
//       break;
//     }
//   }
// };
