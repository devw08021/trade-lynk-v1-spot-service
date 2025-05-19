import Decimal from 'decimal.js';

Decimal.set({ precision: 20 });

export class PricingUtil {

  static formatPrice(price: string | number, precision: number): string {
    return new Decimal(price).toFixed(precision);
  }
  

  static formatQuantity(quantity: string | number, precision: number): string {
    return new Decimal(quantity).toFixed(precision);
  }
  
  static calculateTotal(price: string | number, quantity: string | number): string {
    return new Decimal(price).mul(quantity).toString();
  }
  

  static calculateFee(amount: string | number, feeRate: string | number): string {
    return new Decimal(amount).mul(feeRate).toString();
  }
  
  static isValidPrice(price: string | number, minPrice: string | number, maxPrice: string | number, precision: number): boolean {
    const priceDecimal = new Decimal(price);
    
    if (priceDecimal.lt(minPrice) || priceDecimal.gt(maxPrice)) {
      return false;
    }
    
    const decimalPlaces = PricingUtil.countDecimalPlaces(price.toString());
    return decimalPlaces <= precision;
  }
  
  static isValidQuantity(
    quantity: string | number, 
    minQuantity: string | number, 
    maxQuantity: string | number, 
    precision: number
  ): boolean {
    const quantityDecimal = new Decimal(quantity);
    
    if (quantityDecimal.lt(minQuantity) || quantityDecimal.gt(maxQuantity)) {
      return false;
    }
    
    const decimalPlaces = PricingUtil.countDecimalPlaces(quantity.toString());
    return decimalPlaces <= precision;
  }
  
  static meetsMinimumNotional(
    price: string | number, 
    quantity: string | number, 
    minNotional: string | number
  ): boolean {
    const notional = new Decimal(price).mul(quantity);
    return notional.gte(minNotional);
  }
  
  static calculatePriceChangePercent(
    currentPrice: string | number, 
    previousPrice: string | number
  ): string {
    if (new Decimal(previousPrice).equals(0)) {
      return '0';
    }
    
    return new Decimal(currentPrice)
      .minus(previousPrice)
      .div(previousPrice)
      .mul(100)
      .toString();
  }
  
  private static countDecimalPlaces(numStr: string): number {
    const decimalPart = numStr.split('.')[1];
    return decimalPart ? decimalPart.length : 0;
  }
} 