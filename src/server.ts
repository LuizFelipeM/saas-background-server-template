import "reflect-metadata";

import express from "express";
import basicAuth from "express-basic-auth";
import { registerWorkers } from "processors";
import { initializeBullBoard } from "./configs/bull";
import { DITypes } from "./lib/di.container/types";
import { DIContainer } from "./lib/di.container";

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.BULL_BOARD_USER || !process.env.BULL_BOARD_PASSWORD)
) {
  throw new Error(
    "BULL_BOARD_USER and BULL_BOARD_PASSWORD must be set in production"
  );
}

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const bullBoardPath = "/admin/bull";
const serverAdapter = initializeBullBoard();
serverAdapter.setBasePath(bullBoardPath);

app.use(
  bullBoardPath,
  basicAuth({
    challenge: true,
    users: {
      [String(process.env.BULL_BOARD_USER ?? "admin")]: String(
        process.env.BULL_BOARD_PASSWORD ?? "admin"
      ),
    },
  }),
  serverAdapter.getRouter()
);

app.post("/create-queue", (req, res) => {
  const { queueName } = req.body;
  const queueManager = DIContainer.getInstance(DITypes.QueueManager);
  queueManager.createQueue(queueName, {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });
  res.json({ status: "ok" });
});

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Webhook retry endpoint
app.post("/webhooks/retry", async (req, res) => {
  try {
    const { webhookEventId } = req.body;

    if (!webhookEventId) {
      return res.status(400).json({
        success: false,
        message: "webhookEventId is required",
      });
    }

    if (typeof webhookEventId !== "string") {
      return res.status(400).json({
        success: false,
        message: "webhookEventId must be a string",
      });
    }

    const webhookService = DIContainer.getInstance(DITypes.WebhookService);
    const result = await webhookService.retryWebhookEvent(webhookEventId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error in webhook retry endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Start the server
app.listen(port, () => {
  registerWorkers();

  console.log(`\nServer is running on port ${port}`);
  console.log(
    `Bull Board is available at http://localhost:${port}${bullBoardPath}`
  );
});
