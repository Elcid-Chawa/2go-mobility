import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

const start = async (): Promise<void> => {
  await connectDatabase();
  createApp().listen(env.PORT, () => {
    console.info(`Delivery service listening on port ${env.PORT}`);
  });
};

start().catch((error: unknown) => {
  console.error("Delivery service failed to start", error);
  process.exitCode = 1;
});
