import { Server } from "@grpc/grpc-js";
import { loadPackageDefinition } from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { UserServiceImpl } from "@/grpc/services/userService.js";
// import { TradingServiceImpl } from "@/grpc/services/tradingService.js";
import { AdminServiceImpl } from "@/grpc/services/adminService.js";

import { GrpcMiddleware } from "@/grpc/middleware/grpcMiddleware.js";
import { GrpcLogger } from "@/grpc/utils/grpcLogger.js";
import { GrpcError } from "@/grpc/utils/grpcError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GrpcServer {
  constructor() {
    this.server = new Server();
    this.services = new Map();
    this.middleware = new GrpcMiddleware();
    this.logger = new GrpcLogger();
  }

  async initialize() {
    try {
      const protoPaths = [
        path.join(__dirname, "protos/p2p.proto"),
        path.join(__dirname, "protos/spot.proto"),
      ];

      const packageDefinition = loadSync(protoPaths, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const grpcObject = loadPackageDefinition(packageDefinition);

      const p2pService = new UserServiceImpl();
      const spotService = new SpotService();
      const adminService = new AdminServiceImpl();

      this.addService(grpcObject.user.UserService, userService);
      this.addService(grpcObject.trading.TradingService, tradingService);
      this.addService(grpcObject.admin.AdminService, adminService);

      this.services.set("user", userService);
      this.services.set("trading", tradingService);
      this.services.set("admin", adminService);

      this.logger.info("gRPC server initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize gRPC server:", error);
      throw error;
    }
  }

  addService(serviceDefinition, implementation) {
    const wrappedImplementation = {};

    for (const [methodName, methodImpl] of Object.entries(implementation)) {
      wrappedImplementation[methodName] = async (call, callback) => {
        try {
          await this.middleware.before(call);

          const result = await methodImpl.call(implementation, call, callback);

          await this.middleware.after(call, result);

          return result;
        } catch (error) {
          const grpcError = GrpcError.fromError(error);
          this.logger.error(`gRPC method ${methodName} failed:`, error);
          callback(grpcError);
        }
      };
    }

    this.server.addService(serviceDefinition.service, wrappedImplementation);
  }

  async start(port = 50051) {
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${port}`,
        Server.createInsecure(),
        (error, port) => {
          if (error) {
            this.logger.error("Failed to start gRPC server:", error);
            reject(error);
          } else {
            this.server.start();
            this.logger.info(`gRPC server started on port ${port}`);
            resolve(port);
          }
        }
      );
    });
  }

  async stop() {
    return new Promise((resolve) => {
      this.server.tryShutdown(() => {
        this.logger.info("gRPC server stopped");
        resolve();
      });
    });
  }

  getService(name) {
    return this.services.get(name);
  }
}

export default GrpcServer;
