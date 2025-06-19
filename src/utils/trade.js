import { mult, div } from './math.js'

const parseInput = (input) => parseFloat(input) || 0;

export const initialMarginCalc = async ({
    Symbol,
    Side,
    Volume,
    Leverage,
    Bid,
    Ask,
    group,
}) => {

    let pair = []
    if (group) pair = group.filter(item => item.Symbol == Symbol)
    if (pair) pair = pair[0]

    if (!Bid)
        Bid = parseInput(pair?.Bid)
    if (!Ask)
        Ask = parseInput(pair?.Ask)

    let CalcMode = parseInt(pair?.CalcMode)
    let ContractSize = parseInt(pair?.ContractSize);
    let MarginInitial = pair?.groupSymbolSetting?.MarginInitial == "default" ?
        parseInput(pair?.MarginInitial) :
        parseInput(pair?.groupSymbolSetting?.MarginInitial)
    let MarginMaintenance = pair?.groupSymbolSetting?.MarginMaintenance == "default" ?
        parseInput(pair?.MarginMaintenance) : parseInput(pair?.groupSymbolSetting?.MarginMaintenance)
    let MarginInitialBuy = parseInput(pair?.MarginInitialBuy)
    let MarginInitialSell = parseInput(pair?.MarginInitialSell)
    let MarginMaintenanceBuy = parseInput(pair?.MarginMaintenanceBuy)
    let MarginMaintenanceSell = parseInput(pair?.MarginMaintenanceSell)
    let TickValue = parseInput(pair?.TickValue)
    let TickSize = parseInput(pair?.TickSize)
    let CurrencyProfit = pair?.CurrencyProfit
    let CurrencyMargin = pair?.CurrencyMargin
    let DepositCurrency = pair?.groupDetail?.Currency


    // console.log("Symbol", Symbol, "Side", Side, "Volume", Volume, "CalcMode", CalcMode, "ContractSize", ContractSize, "Leverage", Leverage, "Bid", Bid, "Ask", Ask, "MarginInitial", MarginInitial, "MarginMaintenance", MarginMaintenance, "MarginInitialBuy", MarginInitialBuy, "MarginInitialSell", MarginInitialSell, "MarginMaintenanceBuy", MarginMaintenanceBuy, "MarginMaintenanceSell", MarginMaintenanceSell, "CurrencyBase", CurrencyBase, "CurrencyProfit", CurrencyProfit, "CurrencyMargin", CurrencyMargin, "DepositCurrency", DepositCurrency, "TickValue", TickValue, "TickSize", TickSize)
    //CalcMode 
    //  0 =The Forex calculation mode
    //  1 =The Futures calculation mode
    //  2 =The CFD calculation mode
    //  3 =The CFDIndex futures calculation mode
    //  4 =The CFDLeverage futures calculation mode
    //  32 =The Exchange Stocks futures calculation mode
    try {
        Side = Side.toLowerCase();
        Volume = parseInput(Volume);
        Leverage = parseInput(Leverage);

        CalcMode = parseInt(CalcMode)
        ContractSize = parseInput(ContractSize);


        const VolMulCon = mult(Volume, 8, ContractSize, 8);
        let margin = 0

        // Maintenance or Initial Margin Calculation
        // margin or mainten margin is > 0
        // volume * margin or mainten whitch is > 0


        if (Side === "buy" && MarginInitial > 0) {
            let fixedMargin = mult(Volume, 8, mult(MarginInitialBuy, 8, MarginInitial, 8), 8);

            if (CalcMode == 0 || CalcMode == 1 || CalcMode == 4)
                margin = div(fixedMargin, Leverage, 8)
            else margin = fixedMargin
        } else
            if (Side === "sell" && MarginInitial > 0) {
                let fixedMargin = mult(Volume, 8, mult(MarginInitialSell, 8, MarginInitial, 8), 8);
                if (CalcMode == 0 || CalcMode == 1 || CalcMode == 4)
                    margin = div(fixedMargin, Leverage, 8)
                else margin = fixedMargin
            } else
                if (Side === "buy" && MarginMaintenance > 0) {
                    let fixedMargin = mult(Volume, 8, mult(MarginMaintenanceBuy, 8, MarginMaintenance, 8), 8);
                    if (CalcMode == 0 || CalcMode == 1 || CalcMode == 4)
                        margin = div(fixedMargin, Leverage, 8)
                    else margin = fixedMargin
                } else
                    if (Side === "sell" && MarginMaintenance > 0) {
                        let fixedMargin = mult(Volume, 8, mult(MarginMaintenanceSell, 8, MarginMaintenance, 8), 8);
                        if (CalcMode == 0 || CalcMode == 1 || CalcMode == 4)
                            margin = div(fixedMargin, Leverage, 8)
                        else margin = fixedMargin
                    } else {
                        // Calculation by mode
                        switch (CalcMode) {
                            case 0: // Forex
                                // Volume in lots * Contract size / Leverage
                                margin = div(VolMulCon, Leverage, 8)
                                break;
                            case 1: // Futures
                                // Volume in lots * Contract size / Leverage
                                margin = div(VolMulCon, Leverage, 8)
                                break;

                            case 2: // CFD
                                // Volume in lots * Contract size * Open market price
                                margin = mult(VolMulCon, 8, Side === "buy" ? Ask : Bid, 8)
                                break;

                            case 3: // Index CFDs
                                // Volume in lots * Contract size * Open market price * Tick price / Tick size
                                const price = Side === "buy" ? Bid : Ask;
                                return div(mult(mult(VolMulCon, 8, price, 8), 8, TickValue, 8), TickSize, 8);

                            case 4: // Leverage CFDs
                                // Volume in lots * Contract size * Open market price / Leverage
                                margin = div(mult(VolMulCon, 8, Side === "buy" ? Bid : Ask, 8), Leverage, 8);
                                break;
                            default:
                                return 0;
                        }

                        if (Side === "buy" && MarginInitialBuy > 0) margin = mult(margin, 8, MarginInitialBuy, 8)
                        else if (Side === "sell" && MarginInitialSell > 0) margin = mult(margin, 8, MarginInitialSell, 8)
                        else if (Side === "buy" && MarginMaintenanceBuy > 0) margin = mult(margin, 8, MarginMaintenanceBuy, 8)
                        else if (Side === "sell" && MarginMaintenanceSell > 0) margin = mult(margin, 8, MarginMaintenanceSell, 8)
                    }


        if (CurrencyMargin != DepositCurrency) {
            if (CurrencyProfit == DepositCurrency) {
                margin = Side === "buy" ? mult(margin, 8, Ask, 8) : mult(margin, 8, Bid, 8)
            } else {
                let conversionPair = group.filter(item => item.Symbol == `${pair?.groupDetail?.Currency}${pair?.CurrencyMargin}`)
                if (conversionPair && conversionPair.length > 0) {
                    conversionPair = conversionPair?.[0]
                    margin = div(margin, conversionPair?.Bid, 8)
                } else {
                    conversionPair = group.filter(item => item.Symbol == `${pair?.CurrencyMargin}${pair?.groupDetail?.Currency}`)
                    if (conversionPair && conversionPair.length > 0) {
                        conversionPair = conversionPair?.[0]
                        margin = mult(margin, 8, conversionPair?.Bid, 8)
                    }
                }

            }
        }
        return margin;
    } catch (err) {
        console.error('Error in initialMarginCalc:', err);
        return 0;
    }
};