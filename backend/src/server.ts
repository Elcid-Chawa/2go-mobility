import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import jwt from "jsonwebtoken";
import { User } from "./modules/users/user.model";
import { Trip } from "./modules/trips/trip.model";
import { Customer } from "./modules/customers/customer.model";
import { Driver } from "./modules/drivers/driver.model";

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDatabase();

    // 2. Initialize App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.IO
    const io = new SocketIOServer(server, {
      cors: {
        origin: env.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Attach io to global/context if needed
    app.set("io", io);

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("Authentication required"));
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
          userId: string;
        };
        const user = await User.findById(payload.userId);
        if (!user || user.status !== "ACTIVE")
          return next(new Error("Authentication failed"));
        socket.data.userId = user._id.toString();
        socket.data.role = user.role;
        next();
      } catch {
        next(new Error("Authentication failed"));
      }
    });

    io.on("connection", (socket) => {
      logger.info(`Socket connected: ${socket.id}`);
      socket.join(`user:${socket.data.userId}`);
      if (socket.data.role === "CUSTOMER") socket.join("customers");
      if (socket.data.role === "OPERATIONS" || socket.data.role === "ADMIN")
        socket.join("operations");

      socket.on(
        "trip:join",
        async (
          tripId: string,
          callback?: (result: { joined: boolean; message?: string }) => void,
        ) => {
          const trip = await Trip.findById(tripId).select(
            "customerId driverId",
          );
          if (!trip)
            return callback?.({ joined: false, message: "Trip not found" });
          const [customer, driver] = await Promise.all([
            Customer.findOne({ userId: socket.data.userId }).select("_id"),
            Driver.findOne({ userId: socket.data.userId }).select("_id"),
          ]);
          const isCustomer =
            customer?._id.toString() === trip.customerId.toString();
          const isDriver = driver?._id.toString() === trip.driverId?.toString();
          const canJoin =
            isCustomer ||
            isDriver ||
            socket.data.role === "OPERATIONS" ||
            socket.data.role === "ADMIN";
          if (!canJoin)
            return callback?.({
              joined: false,
              message: "Not authorized for this trip",
            });
          socket.join(`trip:${tripId}`);
          callback?.({ joined: true });
        },
      );

      socket.on("disconnect", () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    // 4. Start listening
    server.listen(env.PORT, () => {
      logger.info(
        `🚀 2GO Authoritative Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`,
      );
      logger.info(
        `📡 Healthcheck available at: http://localhost:${env.PORT}/health`,
      );
      logger.info(
        `🔐 Auth API available at: http://localhost:${env.PORT}/api/v1/auth`,
      );
    });
  } catch (error) {
    logger.error("Fatal startup error", { error });
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}
