import { DIContainer } from "@/lib/di.container";
import { DITypes } from "@/lib/di.container/types";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

export const serverAdapter = new ExpressAdapter();

const queueManager = DIContainer.getInstance(DITypes.QueueManager);

const { addQueue, removeQueue } = createBullBoard({
  queues: queueManager.getAllQueues().map((queue) => new BullMQAdapter(queue)),
  serverAdapter,
});

queueManager.subscribe("queueCreated", (queue) => {
  addQueue(new BullMQAdapter(queue));
});

queueManager.subscribe("queueRemoved", (queue) => {
  removeQueue(new BullMQAdapter(queue));
});
