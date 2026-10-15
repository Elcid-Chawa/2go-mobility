import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

const start = async (): Promise<void> => {
  await connectDatabase();
  createApp().listen(env.PORT, () => {
    console.info(`Car rentals service listening on port ${env.PORT}`);
  });
};

start().catch((error: unknown) => {
  console.error("Car rentals service failed to start", error);
  process.exitCode = 1;
});
