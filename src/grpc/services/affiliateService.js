// const grpc = require("@grpc/grpc-js");
// var protoLoader = require("@grpc/proto-loader");

// // import config
// import config from "../config";

// // import proto
// const AFFILIATE_PROTO_PATH = __dirname + "/affiliate.proto";

// const options = {
//   keepCase: true,
//   longs: String,
//   enums: String,
//   defaults: true,
//   oneofs: true,
// };

// const affiliatePkgDef = protoLoader.loadSync(AFFILIATE_PROTO_PATH, options);
// const Affiliate = grpc.loadPackageDefinition(affiliatePkgDef).Req;
// const client = new Affiliate(
//   config.GRPC.AFFILIATE_URL,
//   grpc.credentials.createInsecure()
// );

// export const distributeBrokerage = async (reqBody) => {
//   return new Promise((resolve, reject) => {
//     client.distributeBrokerage(
//       {
//         refereeId: reqBody.refereeId.toString(),
//         orderId: reqBody.orderId.toString(),
//         currencyId: reqBody.currencyId.toString(),
//         amount: reqBody.amount.toString(),
//         exchange: "spot",
//       },
//       (err, resp) => {
//         if (err) reject(err);
//         else resolve(resp);
//       }
//     );
//   }).catch((err) => {
//     return { status: false, error: "Error on Connection" };
//   });
// };

// export const updateSTV = async (reqBody) => {
//   return new Promise((resolve, reject) => {
//     client.updateSTV(
//       {
//         userId: reqBody.userId.toString(),
//         exchange: "spot",
//         amount: reqBody.amount.toString(),
//         currencyId: reqBody.currencyId.toString(),
//       },
//       (err, resp) => {
//         if (err) reject(err);
//         else resolve(resp);
//       }
//     );
//   }).catch((err) => {
//     return { status: false, error: "Error on Connection" };
//   });
// };