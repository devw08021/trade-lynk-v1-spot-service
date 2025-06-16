export interface PairData {
    _id: string;
    firstFloatDigit: number;
    secondFloatDigit?: number;
    tikerRoot: string;
    firstCurrencyId: string;
    secondCurrencyId: string;
    firstCurrency: string;
    secondCurrency: string;
  }
  
 export interface OrderData {
    _id: string;
    userId: string;
    pairId: string;
    price: number | string;
    quantity: number;
    amount?: number;
    orderValue: number;
    openOrderValue?: number;
    filledQuantity: number;
    averagePrice: number;
    orderDate: number;
    createdAt?: number;
    buyorsell: 'buy' | 'sell';
    status: 'pending' | 'completed';
    liquidityType: string;
    isLiquidity?: boolean;
    flag?: boolean;
    makerFee: number;
    takerFee: number;
    firstCurrencyId: string;
    secondCurrencyId: string;
    firstCurrency: string;
    secondCurrency: string;
    firstFloatDigit: number;
    tradePrice?: number;
    tradeQty?: number;
    fee?: number;
    triggerPrice?: number;
  }
  
 export interface TradeHistoryData {
    buyOrderData: OrderData;
    sellOrderData: OrderData;
    uniqueId: number;
    execPrice: number;
    Maker: 'buy' | 'sell';
    buyerFee: number;
    sellerFee: number;
    execQuantity: number;
    ordertype: 'Limit' | 'Market';
  }
  export interface PassbookData {
    userId: string;
    coin: string;
    currencyId: string;
    tableId: string;
    beforeBalance: number;
    afterBalance: number;
    amount: number;
    type: string;
    category: 'credit' | 'debit';
  }
  
 export interface OrderBookData {
    buyorsell: 'buy' | 'sell';
    price: number | string;
    minusQuantity: number;
    pairId: string;
    firstFloatDigit: number;
  }
  
 export interface ChartData {
    pairName: string;
    price: number;
  }
  
 export interface UserDoc {
    feeManagement?: string[];
  }
  