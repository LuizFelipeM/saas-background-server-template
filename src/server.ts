import "reflect-metadata";
import express from "express";
import basicAuth from "express-basic-auth";
import { registerWorkers } from "processors";
import { serverAdapter } from "./configs/bull";

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

const bullBoardPath = "/admin/bull";
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

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start the server
app.listen(port, () => {
  registerWorkers();

  console.log(`\nServer is running on port ${port}`);
  console.log(
    `Bull Board is available at http://localhost:${port}${bullBoardPath}`
  );
});
