import mongoose from "mongoose";
import { Hono } from "hono";

// Models (align with your actual model files)
import TradeHistory from "@/models/schema/trades.js";
import SpotOrder from "@/models/schema/order.js";
import OrderHistory from "@/models/schema/orderHistory.js";

// Helpers
import {
  paginationQuery,
  columnFillter,
  tradeHistoryFilter,
} from "@/lib/adminHelpers.js";
import isEmpty from "@/lib/isEmpty.js";
import { momentFormat } from "@/lib/dateTimeHelper.js";
import capitalize from "@/lib/capitalize.js";

// Redis
import { hgetField } from "@/config/redis.js";

export default class AdminHistoryController {
  // GET /spot-order-history
  spotOrderHistory = async (c) => {
    try {
      const q = c.req.query();
      const pagination = paginationQuery(q);
      const filter = columnFillter(q, c.req.header("timezone"));
      const sortObj = !isEmpty(JSON.parse(q.sortObj || "{}"))
        ? JSON.parse(q.sortObj)
        : { _id: -1 };

      const count = await OrderHistory.aggregate(
        [
          {
            $project: {
              orderDate: 1,
              _id: 1,
              firstCurrency: 1,
              secondCurrency: 1,
              orderType: 1,
              buyorsell: 1,
              averagePrice: "$avgPrice",
              price: 1,
              filledQuantity: "$filledQty",
              openQuantity: "$qty",
              orderValue: 1,
              conditionalType: 1,
              userCode: 1,
              status: 1,
              flag: 1,
              userId: 1,
              orderCode: 1,
            },
          },
          { $match: filter },
          { $sort: sortObj },
        ],
        { allowDiskUse: true }
      );

      const data = await OrderHistory.aggregate(
        [
          {
            $project: {
              orderDate: 1,
              _id: 1,
              userCode: 1,
              firstCurrency: 1,
              secondCurrency: 1,
              orderType: 1,
              buyorsell: 1,
              averagePrice: "$avgPrice",
              price: 1,
              filledQuantity: "$filledQty",
              openQuantity: "$qty",
              orderValue: 1,
              conditionalType: 1,
              status: 1,
              flag: 1,
              userId: 1,
              orderCode: 1,
              Price: { $cond: [{ $eq: ["$flag", true] }, "market", "$price"] },
              execPrice: {
                $cond: [
                  { $eq: ["$filledQty", 0] },
                  "0",
                  {
                    $divide: [
                      "$avgPrice",
                      { $cond: [{ $eq: ["$filledQty", 0] }, 1, "$filledQty"] },
                    ],
                  },
                ],
              },
            },
          },
          { $match: filter },
          { $sort: sortObj },
          { $skip: pagination.skip },
          { $limit: pagination.limit },
        ],
        { allowDiskUse: true }
      );

      return c.json({
        success: true,
        messages: "success",
        result: { count: count.length, data },
      });
    } catch (err) {
      console.log("spotOrderHistory error", err);
      return c.json(
        { success: false, errors: { messages: "Error on server" } },
        500
      );
    }
  };

  // GET /spot-order-history-doc
  spotOrderHistoryDoc = async (c) => {
    try {
      const q = c.req.query();
      const Export = q.doc;
      const header = [
        "Date",
        "User Id",
        "Reference Id",
        "Base Currency",
        "Quote Currency",
        "Type",
        "Side",
        "Executed price",
        "Price",
        "Filled Amount",
        "Amount",
        "Total",
        "Status",
      ];
      const sortObj = !isEmpty(JSON.parse(q.sortObj || "{}"))
        ? JSON.parse(q.sortObj)
        : { _id: -1 };

      const type = columnFillter(q, c.req.header("timezone"));
      if (type.userId && type.userId.length !== 24) {
        type.userId = "000000000000000000000000";
      }
      if (type.userId && type.userId.length === 24) {
        type.userId = new mongoose.Types.ObjectId(type.userId);
      }

      const projection = {
        orderDate: 1,
        _id: 1,
        userCode: 1,
        firstCurrency: 1,
        secondCurrency: 1,
        orderType: 1,
        buyorsell: 1,
        averagePrice: "$avgPrice",
        price: 1,
        filledQuantity: "$filledQty",
        openQuantity: "$qty",
        orderValue: 1,
        conditionalType: 1,
        status: 1,
        flag: 1,
        userId: 1,
        Price: { $cond: [{ $eq: ["$flag", true] }, "market", "$price"] },
        execPrice: {
          $cond: [
            { $eq: ["$filledQty", 0] },
            "0",
            {
              $divide: [
                "$avgPrice",
                { $cond: [{ $eq: ["$filledQty", 0] }, 1, "$filledQty"] },
              ],
            },
          ],
        },
      };

      if (Export === "csv" || Export === "xls") {
        const exportData = await OrderHistory.aggregate([
          { $project: projection },
          { $match: type },
          { $sort: sortObj },
        ]);

        const rows = [header];
        for (const item of exportData) {
          const status = item.status === "cancel" ? "Cancelled" : item.status;
          rows.push([
            momentFormat(String(item.orderDate)),
            item._id,
            item.userCode,
            item.firstCurrency,
            item.secondCurrency,
            capitalize(item.orderType || ""),
            capitalize(item.buyorsell || ""),
            item && item.execPrice ? Number(item.execPrice).toFixed(8) : "0",
            item && item.flag === true ? "Market" : item.price,
            item.filledQuantity,
            item.orderType === "market" && item.buyorsell === "buy"
              ? Number(item.filledQuantity || 0).toFixed(8)
              : Number(item.openQuantity || 0).toFixed(8),
            item.averagePrice,
            capitalize(status || ""),
          ]);
        }

        const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
        c.header("Content-Type", "text/csv; charset=utf-8");
        c.header(
          "Content-Disposition",
          `attachment; filename="spot-order-history.${Export}"`
        );
        return c.body(csv);
      } else {
        const data = await OrderHistory.aggregate([
          { $project: projection },
          { $match: type },
          { $sort: sortObj },
        ]);
        return c.json({ success: true, messages: "success", result: { data } });
      }
    } catch (err) {
      console.log("spotOrderHistoryDoc error", err);
      return c.json(
        { success: false, errors: { messages: "Error on server" } },
        500
      );
    }
  };

  // GET /spot-trade-history
  spotTradeHistory = async (c) => {
    try {
      const q = c.req.query();
      const pagination = paginationQuery(q);

      // Get admin liquidity for filtering
      let adminLiq = await hgetField("admin_liquidity", "liquidation");
      if (typeof adminLiq === "string") {
        try {
          adminLiq = JSON.parse(adminLiq);
        } catch {}
      }

      // inject adminId into filter payload
      const fillterObj = JSON.parse(q.fillter || "{}");
      fillterObj.adminId = adminLiq?._id;
      const withAdminFilter = { ...q, fillter: JSON.stringify(fillterObj) };
      const filter = columnFillter(withAdminFilter, c.req.header("timezone"));

      const sortObj = !isEmpty(JSON.parse(q.sortObj || "{}"))
        ? JSON.parse(q.sortObj)
        : { _id: -1 };

      const statusmatch = { status: "completed" };

      // count
      const count = await TradeHistory.aggregate(
        [{ $match: statusmatch }, { $match: filter }],
        { allowDiskUse: true }
      );

      // data
      const data = await TradeHistory.aggregate(
        [
          {
            $project: {
              firstCurrency: "$baseSymbol",
              _id: 1,
              secondCurrency: "$quoteSymbol",
              buyorsell: "$isMaker", // no strict mapping; kept for compatibility
              tradePrice: 1,
              tradeQty: 1,
              orderValue: "$tradeOrderValue",
              sellUserId: "$sellerId",
              buyUserId: "$buyerId",
              buyerFee: 1,
              sellerFee: 1,
              createdAt: 1,
              isMaker: 1,
              buyUserCode: "$buyerCode",
              sellUserCode: "$sellerCode",
              execPrice: "$tradePrice",
              adminId: adminLiq?._id,
            },
          },
          { $match: filter },
          { $sort: sortObj },
          { $skip: pagination.skip },
          { $limit: pagination.limit },
        ],
        { allowDiskUse: true }
      );

      return c.json({
        success: true,
        messages: "success",
        result: { count: count.length, data, adminData: adminLiq },
      });
    } catch (err) {
      console.log("spotTradeHistory error", err);
      return c.json(
        { success: false, errors: { messages: "Error on server" } },
        500
      );
    }
  };

  // GET /spot-trade-history-doc
  spotTradeHistoryDoc = async (c) => {
    try {
      const q = c.req.query();
      const sortObj = !isEmpty(JSON.parse(q.sortObj || "{}"))
        ? JSON.parse(q.sortObj)
        : { _id: -1 };

      const type =
        q.mode === "userhistory"
          ? tradeHistoryFilter(q)
          : columnFillter(q, c.req.header("timezone"));

      const data = await TradeHistory.aggregate([
        {
          $project: {
            firstCurrency: "$baseSymbol",
            _id: 1,
            secondCurrency: "$quoteSymbol",
            buyorsell: "$isMaker",
            execPrice: "$tradePrice",
            quantity: "$tradeQty",
            orderValue: "$tradeOrderValue",
            buyerFee: 1,
            buyUserId: "$buyerId",
            sellUserId: "$sellerId",
            sellerFee: 1,
            createdAt: 1,
            buyUserCode: "$buyerCode",
            sellUserCode: "$sellerCode",
            isMaker: 1,
            tradeQty: 1,
            tradePrice: 1,
          },
        },
        { $match: type },
        { $sort: sortObj },
      ]);

      return c.json({ success: true, messages: "success", result: { data } });
    } catch (err) {
      console.log("spotTradeHistoryDoc error", err);
      return c.json(
        { success: false, errors: { messages: "Error on server" } },
        500
      );
    }
  };

  // GET /spot-trade-user-history
  spotTradeUserHistory = async (c) => {
    try {
      const q = c.req.query();
      const pagination = paginationQuery(q);

      let filter = tradeHistoryFilter(q);
      let searcher = columnFillter(q, c.req.header("timezone"));
      delete searcher["sellUserId"];
      delete searcher["buyUserId"];
      filter = { ...filter, ...searcher };

      const sortObj = !isEmpty(JSON.parse(q.sortObj || "{}"))
        ? JSON.parse(q.sortObj)
        : { _id: -1 };

      const statusmatch = { status: "completed" };

      const count = await TradeHistory.countDocuments({
        ...filter,
        ...statusmatch,
      });

      const data = await TradeHistory.aggregate([
        {
          $project: {
            firstCurrency: "$baseSymbol",
            _id: 1,
            secondCurrency: "$quoteSymbol",
            buyorsell: "$isMaker",
            execPrice: "$tradePrice",
            quantity: "$tradeQty",
            orderValue: "$tradeOrderValue",
            buyerFee: 1,
            buyUserId: "$buyerId",
            sellUserId: "$sellerId",
            sellerFee: 1,
            createdAt: 1,
            buyUserCode: "$buyerCode",
            sellUserCode: "$sellerCode",
            isMaker: 1,
            tradeQty: 1,
            tradePrice: 1,
          },
        },
        { $match: filter },
        { $sort: sortObj },
        { $skip: pagination.skip },
        { $limit: pagination.limit },
      ]);

      return c.json({
        success: true,
        messages: "success",
        result: { count, data },
      });
    } catch (err) {
      console.log("spotTradeUserHistory error", err);
      return c.json(
        { success: false, errors: { messages: "Error on server" } },
        500
      );
    }
  };
}

function escapeCsv(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
