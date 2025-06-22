import { hgetField, hicByFloat, hsetField, hdelField, hIncBy } from '../../config/redis.js'
import { toFixedDown } from '../../utils/trunc.js'

export const cancelMOrder = async (tableId, orderId) => {
    try {
        let checkOrder = await hgetField(tableId, orderId);
        if (checkOrder) {
            checkOrder.status = "cancel";
            let currencyId =
                checkOrder.buyorsell == "buy"
                    ? checkOrder.secondCurrencyId
                    : checkOrder.firstCurrencyId;
            let orderValue =
                checkOrder.buyorsell == "buy"
                    ? checkOrder.price * checkOrder.quantity
                    : checkOrder.quantity;
            let marketValue =
                checkOrder.orderType == "market" && checkOrder.buyorsell == "buy"
                    ? checkOrder.orderValue
                    : checkOrder.amount;
            let retriveValue =
                checkOrder.orderType == "limit" ? orderValue : marketValue;
            retriveValue = parseFloat(retriveValue);
            if (checkOrder.orderType != "market") {
                updateBook({
                    buyorsell: checkOrder.buyorsell,
                    price: checkOrder.price,
                    minusQuantity: checkOrder.quantity,
                    pairId: checkOrder.pairId,
                    firstFloatDigit: checkOrder.firstFloatDigit,
                });
            }
            let userWallet = await hicByFloat(
                "walletbalance_spot",
                checkOrder.userId + "_" + currencyId,
                retriveValue
            );

            await hsetField(
                "orderHist_" + checkOrder.userId,
                checkOrder._id,
                checkOrder
            );
            await hdelField(tableId, orderId);
            // getOpenOrderSocket(checkOrder.userId, checkOrder.pairId);
            // getOrderHistorySocket(checkOrder.userId, checkOrder.pairId);
            // newOrderHistory(checkOrder);

            // socketEmitOne(
            //     "updateTradeAsset",
            //     {
            //         currencyId: currencyId,
            //         spotBal: userWallet,
            //     },
            //     checkOrder.userId
            // );
            return true;
        }
        return true;
    } catch (err) {
        return false;
    }
};

export const minTwoDigits = (n) => {
    let j = 1;
    for (let i = 0; i < n; i++) {
        j = j + "0";
    }
    return parseFloat(j);
};

export const updateBook = async ({
    buyorsell,
    price,
    minusQuantity,
    pairId,
    firstFloatDigit,
}) => {
    try {
        let decimalval = minTwoDigits(firstFloatDigit);
        let quntitydecimal = Math.round(minusQuantity * decimalval);
        quntitydecimal = toFixedDown(quntitydecimal, firstFloatDigit);
        await hIncBy(buyorsell == 'buy' ? 'b' : 's' + "Book" + pairId, price, -quntitydecimal);
        // getOrderBookSocket(pairId);
        return true;
    } catch (err) {
        console.log("--- err", err);
        return false;
    }
};