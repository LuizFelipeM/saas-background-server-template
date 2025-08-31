import { DIContainer } from "@/lib/di.container";
import { DITypes } from "@/lib/di.container/types";
import { SubscriptionService } from "@/services/subscription.service";
import { JobProcessor, JobResult } from "@saas-packages/queue-manager";
import { Job } from "bullmq";
import { Redis } from "ioredis";
import Stripe from "stripe";

type WebhookState = "waiting_checkout" | "checkout_done" | "invoice_paid";

type StripeInvoice = Stripe.Invoice & {
  subscription: string;
};

export default class StripeWebhookJob implements JobProcessor<Stripe.Event> {
  private readonly redis: Redis;
  private readonly subscriptionService: SubscriptionService;
  private readonly processorMap: {
    [K in Stripe.Event["type"]]?: (event: Stripe.Event) => Promise<JobResult>;
  } = {
    "checkout.session.completed": this.processCheckoutSessionCompleted,
    "invoice.paid": this.processInvoicePaid,
    "customer.subscription.updated": this.processCustomerSubscriptionUpdated,
    "customer.subscription.deleted": this.processCustomerSubscriptionDeleted,
  };

  private stateKey?: string;
  private currentState: WebhookState = "waiting_checkout";
  private job?: Job<Stripe.Event>;

  constructor() {
    this.redis = DIContainer.getInstance(DITypes.Redis);
    this.subscriptionService = DIContainer.getInstance(
      DITypes.SubscriptionService
    );
  }

  async process(job: Job<Stripe.Event>): Promise<JobResult> {
    this.job = job;
    this.job.log(
      `Processing stripe event: ${JSON.stringify(job.data, null, 2)}`
    );

    const event = job.data;
    const eventType = event.type;
    const subscriptionId = (event.data.object as { subscription: string })
      .subscription;

    const processor = this.processorMap[eventType];
    if (!subscriptionId && processor) {
      this.job.log(
        `Skipping event with no subscription ID ${JSON.stringify(
          event,
          null,
          2
        )}`
      );
      throw new Error("Subscription ID is required");
    }

    // State order:
    // 1. waiting_checkout - Initial state waiting for checkout completion
    // 2. checkout_done - Checkout session completed, waiting for invoice
    // 3. invoice_paid - Invoice paid, final state, subscription active
    if (processor) {
      this.stateKey = `stripe:state:${subscriptionId}`;
      const state = (await this.redis.get(this.stateKey)) as WebhookState;
      if (state) this.currentState = state;

      this.job.log(`Processing ${eventType}`);
      return await processor.call(this, event);
    }

    this.job.log(`Event ${eventType} not supported`);
    return {
      success: true,
    };
  }

  private async processCheckoutSessionCompleted(event: Stripe.Event) {
    if (this.currentState !== "waiting_checkout") {
      this.job?.log("Already processed checkout, skipping...");
      return {
        success: false,
        error: "Already processed checkout",
      };
    }

    const session = (event as Stripe.CheckoutSessionCompletedEvent).data.object;
    await this.subscriptionService.completeSession(session);

    await this.redis.set(this.stateKey!, "checkout_done");
    return {
      success: true,
    };
  }

  private async processInvoicePaid(event: Stripe.Event): Promise<JobResult> {
    if (this.currentState === "invoice_paid") {
      this.job?.log("invoice.paid already processed. Skipping...");
      return {
        success: true,
      };
    }

    if (this.currentState !== "checkout_done") {
      this.job?.log("invoice.paid arrived too early. Rescheduling...");
      return {
        success: true,
        delay: 5000,
      };
    }

    const invoice = event.data.object as StripeInvoice;
    const subscriptionId = invoice.subscription;
    await this.subscriptionService.invoicePaid(subscriptionId);

    await this.redis.set(this.stateKey!, "invoice_paid");

    return {
      success: true,
    };
  }

  private async processCustomerSubscriptionUpdated(
    event: Stripe.Event
  ): Promise<JobResult> {
    if (this.currentState !== "invoice_paid") {
      this.job?.log(
        "customer.subscription.updated arrived too early. Rescheduling..."
      );
      return {
        success: true,
        delay: 5000,
      };
    }

    const subscription = (event as Stripe.CustomerSubscriptionUpdatedEvent).data
      .object;
    await this.subscriptionService.subscriptionUpdated(subscription);

    return {
      success: true,
    };
  }

  private async processCustomerSubscriptionDeleted(
    event: Stripe.Event
  ): Promise<JobResult> {
    if (this.currentState !== "invoice_paid") {
      this.job?.log(
        "customer.subscription.deleted arrived too early. Rescheduling..."
      );
      return {
        success: true,
        delay: 5000,
      };
    }

    const subscription = (event as Stripe.CustomerSubscriptionDeletedEvent).data
      .object;
    await this.subscriptionService.subscriptionDeleted(subscription);
    await this.redis.del(this.stateKey!);

    return {
      success: true,
    };
  }
}
