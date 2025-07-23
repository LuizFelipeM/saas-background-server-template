import { DIContainer } from "@/lib/di.container";
import { DITypes } from "@/lib/di.container/types";
import fs from "node:fs";
import path from "node:path";
import { ExternalQueues } from "./configs/ExternalQueues";

export const registerWorkers = () => {
  const queueManager = DIContainer.getInstance(DITypes.QueueManager);

  // Register workers for shared queues
  const sharedQueues = Object.values(ExternalQueues);
  sharedQueues.forEach(async (queue) => {
    try {
      const module = await import(`./workers/${queue}`);
      const queueInstance = queueManager.createQueue(queue, {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        },
      });
      console.log("Created queue", queueInstance.name);
      queueManager.createWorker(queue, new module.default());
    } catch (error) {
      console.error(`Error importing worker for Shared Queue ${queue}:`, error);
    }
  });

  // Register workers from the workers directory
  fs.readdirSync(path.join(__dirname, "workers"))
    .filter((file) => !sharedQueues.includes(file as ExternalQueues))
    .forEach(async (file) => {
      try {
        const module = await import(`./workers/${file}`);

        queueManager.createQueue(file, {
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
          },
        });
        queueManager.createWorker(file, new module.default());
      } catch (error) {
        console.error(`Error importing worker for queue ${file}:`, error);
      }
    });

  // Handle cleanup on process termination
  process.on("SIGTERM", async () => {
    await queueManager.closeAll();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await queueManager.closeAll();
    process.exit(0);
  });
};
