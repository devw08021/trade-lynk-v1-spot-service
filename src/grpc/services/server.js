const grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");

// import config
import config from "../config";

// import controller
import { getAllMarkPrice } from "../controllers/pairManage.controller";
import { cancelOrderForDeactiveAcc } from "../controllers/spot.controller";

const P2P_PROTO_PATH = __dirname + "/p2p.proto";
const SPOT_PROTO_PATH = __dirname + "/spot.proto";

// Enable gRPC server logging
grpc.setLogger(console);
grpc.setLogVerbosity(grpc.logVerbosity.INFO); // Set log level

const server = new grpc.Server();
const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

const spotPkgRef = protoLoader.loadSync(SPOT_PROTO_PATH, options);
const spotProto = grpc.loadPackageDefinition(spotPkgRef);

server.addService(spotProto.Req.service, {
  cancelOrderForDeactiveAcc: async (_, callback) => {
    let data = await cancelOrderForDeactiveAcc(_.request);
    callback(null, { status: true });
  },
});

const p2pPkgDef = protoLoader.loadSync(P2P_PROTO_PATH, options);
const p2pProto = grpc.loadPackageDefinition(p2pPkgDef);

server.addService(p2pProto.Req.service, {
  fetchSpotPrice: async (_, callback) => {
    let data = await getAllMarkPrice(_.request);
    callback(null, data);
  },
});

server.bindAsync(
  config.GRPC.URL,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    console.log("Server at port:", port);
    server.start();
  }
);
