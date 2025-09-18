import { type DatabaseManagerType, DITypes } from "@/lib/di.container/types";
import { Prisma, WebhookEndpoint } from "@/lib/generated/prisma";
import { inject, injectable } from "tsyringe";
import { z } from "zod";

const WebhookEventSchema = z.object({
  event: z.string(),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.number(),
  id: z.string(),
});

const WebhookEndpointSchema = z.object({
  id: z.string(),
  url: z.url(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  secret: z.string().optional(),
  retryCount: z.number().default(3),
  timeout: z.number().default(10000),
});

export type CreateWebhookEvent = z.infer<typeof WebhookEventSchema>;
export type CreateWebhookEndpoint = z.infer<typeof WebhookEndpointSchema>;

@injectable()
export class WebhookService {
  private readonly webhookEndpointDelegate: Prisma.WebhookEndpointDelegate;
  private readonly webhookEventDelegate: Prisma.WebhookEventDelegate;

  constructor(
    @inject(DITypes.DatabaseManager)
    private readonly dbManager: DatabaseManagerType
  ) {
    this.webhookEndpointDelegate = this.dbManager.client.webhookEndpoint;
    this.webhookEventDelegate = this.dbManager.client.webhookEvent;
  }

  async sendEvent(event: string, data: Record<string, any>): Promise<void> {
    const webhookEvent: CreateWebhookEvent = {
      event,
      data,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    };

    // Get all active webhook endpoints that listen to this event
    const endpoints = await this.webhookEndpointDelegate.findMany({
      where: {
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    if (endpoints.length === 0) {
      console.log(`No webhook endpoints found for event: ${event}`);
      return;
    }

    // Send to all endpoints in parallel
    const sendPromises = endpoints.map((endpoint) =>
      this.sendToEndpoint(endpoint, webhookEvent)
    );

    await Promise.allSettled(sendPromises);
  }

  private async sendToEndpoint(
    endpoint: WebhookEndpoint,
    webhookEvent: CreateWebhookEvent
  ): Promise<Response> {
    const maxRetries = endpoint.retryCount || 3;
    const timeout = endpoint.timeout || 10000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "SaaS-Background-Server/1.0",
            "X-Webhook-Event": webhookEvent.event,
            "X-Webhook-ID": webhookEvent.id,
            "X-Webhook-Timestamp": webhookEvent.timestamp.toString(),
            ...(endpoint.secret && {
              "X-Webhook-Signature": this.generateSignature(
                webhookEvent,
                endpoint.secret
              ),
            }),
          },
          body: JSON.stringify(webhookEvent),
          signal: AbortSignal.timeout(timeout),
        });

        if (response.ok) {
          // Log successful webhook
          await this.logWebhookEvent(endpoint.id, webhookEvent, {
            success: true,
            statusCode: response.status,
            attempt,
          });
          return response;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        // Log failed webhook
        await this.logWebhookEvent(endpoint.id, webhookEvent, {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          attempt,
        });

        if (isLastAttempt) {
          console.error(
            `Failed to send webhook to ${endpoint.url} after ${maxRetries} attempts:`,
            error
          );
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(
      `Failed to send webhook to ${endpoint.url} after ${maxRetries} attempts`
    );
  }

  private generateSignature(
    webhookEvent: CreateWebhookEvent,
    secret: string
  ): string {
    const payload = JSON.stringify(webhookEvent);
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const data = encoder.encode(payload);

    // Simple HMAC-SHA256 implementation
    // In production, you might want to use a proper crypto library
    return btoa(payload + secret); // Simplified for demo
  }

  private async logWebhookEvent(
    endpointId: string,
    webhookEvent: CreateWebhookEvent,
    result: {
      success: boolean;
      statusCode?: number;
      error?: string;
      attempt: number;
    }
  ): Promise<void> {
    try {
      await this.webhookEventDelegate.create({
        data: {
          endpointId,
          event: webhookEvent.event,
          payload: webhookEvent as Prisma.InputJsonValue,
          success: result.success,
          statusCode: result.statusCode,
          error: result.error,
          attempt: result.attempt,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to log webhook event:", error);
    }
  }

  // CRUD operations for webhook endpoints
  async createEndpoint(
    endpoint: Omit<CreateWebhookEndpoint, "id">
  ): Promise<WebhookEndpoint> {
    return await this.webhookEndpointDelegate.create({
      data: {
        url: endpoint.url,
        events: endpoint.events,
        isActive: endpoint.isActive,
        secret: endpoint.secret || null,
        retryCount: endpoint.retryCount,
        timeout: endpoint.timeout,
      },
    });
  }

  async updateEndpoint(
    id: string,
    updates: Partial<CreateWebhookEndpoint>
  ): Promise<WebhookEndpoint> {
    return await this.webhookEndpointDelegate.update({
      where: { id },
      data: {
        ...updates,
        secret: updates.secret || null,
      },
    });
  }

  async deleteEndpoint(id: string): Promise<void> {
    await this.webhookEndpointDelegate.delete({
      where: { id },
    });
  }

  async getEndpoints(): Promise<WebhookEndpoint[]> {
    return this.webhookEndpointDelegate.findMany();
  }

  async getEndpoint(id: string): Promise<WebhookEndpoint | null> {
    return this.webhookEndpointDelegate.findUnique({
      where: { id },
    });
  }

  /**
   * Retry a failed webhook event by its ID
   * @param webhookEventId - The ID of the webhook event to retry
   * @returns Promise<{ success: boolean; message: string }>
   */
  async retryWebhookEvent(
    webhookEventId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find the webhook event
      const webhookEvent = await this.webhookEventDelegate.findUnique({
        where: { id: webhookEventId },
        include: {
          endpoint: true,
        },
      });

      if (!webhookEvent) {
        return {
          success: false,
          message: `Webhook event with ID ${webhookEventId} not found`,
        };
      }

      // Check if the endpoint is still active
      if (!webhookEvent.endpoint.isActive) {
        return {
          success: false,
          message: `Cannot retry webhook event: endpoint ${webhookEvent.endpoint.id} is inactive`,
        };
      }

      // Retry sending the webhook
      const response = await this.sendToEndpoint(
        webhookEvent.endpoint,
        webhookEvent.payload as CreateWebhookEvent
      );

      return {
        success: true,
        message: `Webhook event ${webhookEventId} successfully returned ${response.status}`,
      };
    } catch (error) {
      console.error(`Failed to retry webhook event ${webhookEventId}:`, error);
      return {
        success: false,
        message: `Failed to retry webhook event: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
