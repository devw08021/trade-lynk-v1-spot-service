import mongoose from 'mongoose';

// Lib
import isEmpty from '@/lib/isEmpty';

/**
 * Order Place Validation Class
 * Handles validation for different types of spot orders
 */
class OrderPlaceValidator {
  /**
   * Decrypt validation
   * URL : /api/spotOrder
   * METHOD : POST
   * BODY : token
   */
  async decryptValidate(c) {
    const errors = {};
    const reqBody = await c.req.json();

    if (isEmpty(reqBody.token)) {
      errors.token = "REQUIRED";
    }

    if (!isEmpty(errors)) {
      return c.json({ "errors": errors }, 400);
    }

    // Store validated data in context for next middleware
    c.set('validatedData', reqBody);
    return null; // Continue to next middleware
  }

  /**
   * Order place validation - main entry point
   * URL : /api/spotOrder
   * METHOD : POST
   * BODY : orderType(limit,market,stopLimit,oco)
   */
  async orderPlaceValidate(c) {
    const errors = {};
    const reqBody = c.get('validatedData') || await c.req.json();
    
    console.log('-----reqBody.orderType', reqBody.orderType);
    
    if (isEmpty(reqBody.orderType)) {
      errors.orderType = "REQUIRED";
    } else if (!['limit', 'market', 'stop_limit', 'stop_market', 'trailing_stop'].includes(reqBody.orderType)) {
      errors.orderType = "INVALID_ORDER_TYPE";
    }

    if (!isEmpty(errors)) {
      return c.json({ "errors": errors }, 400);
    }

    // Store validated data in context
    c.set('validatedData', reqBody);
    
    // Route to specific validation based on order type
    switch (reqBody.orderType) {
      case 'limit':
        return await this.limitOrderValidate(c);
      case 'market':
        return await this.marketOrderValidate(c);
      case 'stop_limit':
        return await this.stopLimitOrderValidate(c);
      case 'stop_market':
        return await this.stopMarketOrderValidate(c);
      case 'trailing_stop':
        return await this.trailingStopOrderValidate(c);
      default:
        return c.json({ "errors": { orderType: "INVALID_ORDER_TYPE" } }, 400);
    }
  }

  /**
   * Limit order validation
   * URL : /api/spotOrder
   * METHOD : POST
   * BODY : spotPairId, price, quantity, buyorsell
   */
  async limitOrderValidate(c) {
    const errors = {};
    const reqBody = c.get('validatedData');

    if (isEmpty(reqBody.spotPairId)) {
      errors.spotPairId = "REQUIRED";
    } else if (!mongoose.Types.ObjectId.isValid(reqBody.spotPairId)) {
      errors.spotPairId = "Invalid pair";
    }

    if (isEmpty(reqBody.price)) {
      errors.price = "Price field is required";
    } else if (isNaN(reqBody.price)) {
      errors.price = "Price Value only numeric value";
    } else if (parseFloat(reqBody.price) <= 0) {
      errors.price = "Price should be greater than zero";
    }

    if (isEmpty(reqBody.quantity)) {
      errors.quantity = "Quantity field is required";
    } else if (isNaN(reqBody.quantity)) {
      errors.quantity = "Quantity Value only numeric value";
    } else if (parseFloat(reqBody.quantity) <= 0) {
      errors.quantity = "Quantity should be greater than zero";
    }
    
    if (isEmpty(reqBody.buyorsell)) {
      errors.buyorsell = "REQUIRED";
    } else if (!['buy', 'sell'].includes(reqBody.buyorsell)) {
      errors.buyorsell = "INVALID SIDE";
    }

    if (!isEmpty(errors)) {
      return c.json({ "errors": errors }, 400);
    }

    return null; // Continue to next middleware
  }

  /**
   * Market order validation
   * URL : /api/spotOrder
   * METHOD : POST
   * BODY : spotPairId, quantity, buyorsell
   */
  async marketOrderValidate(c) {
    const errors = {};
    const reqBody = c.get('validatedData');
    
    try {
      if (isEmpty(reqBody.spotPairId)) {
        errors.spotPairId = "REQUIRED";
      } else if (!mongoose.Types.ObjectId.isValid(reqBody.spotPairId)) {
        errors.spotPairId = "Invalid pair";
      }

      if (reqBody.buyorsell == 'buy') {
        if (isEmpty(reqBody.orderValue)) {
          errors.orderValue = "Order Value field is Required"
        } else if (isNaN(reqBody.orderValue)) {
          errors.orderValue = "Order Value only numeric value"
        } else if (reqBody.orderValue <= 0) {
          errors.orderValue = "Order Value should be greater than zero"
        }
      } else if (reqBody.buyorsell == 'sell') {
        if (isEmpty(reqBody.amount)) {
          errors.amount = "Quantity field is Required"
        } else if (isNaN(reqBody.amount)) {
          errors.amount = "Quantity only numeric value"
        } else if (reqBody.amount <= 0) {
          errors.amount = "Quantity should be greater than zero"
        }
      }

      if (isEmpty(reqBody.buyorsell)) {
        errors.buyorsell = "REQUIRED";
      } else if (!['buy', 'sell'].includes(reqBody.buyorsell)) {
        errors.buyorsell = "INVALID SIDE";
      }
      
      console.log('---errors', errors);
      if (!isEmpty(errors)) {
        return c.json({ "errors": errors }, 400);
      }

      return null; // Continue to next middleware
    } catch (err) {
      console.log('err: ', err);
      return c.json({ "errors": { general: "Validation error occurred" } }, 500);
    }
  }

  /**
   * Stop Limit order validation
   * URL : /api/spotOrder
   * METHOD : POST
   * BODY : spotPairId, stopPrice, price, quantity, buyorsell, orderType, newdate
   */
  async stopLimitOrderValidate(c) {
    const errors = {};
    const reqBody = c.get('validatedData');

    if (isEmpty(reqBody.spotPairId)) {
      errors.spotPairId = "REQUIRED";
    } else if (!mongoose.Types.ObjectId.isValid(reqBody.spotPairId)) {
      errors.spotPairId = "Invalid pair";
    }

    if (isEmpty(reqBody.stopPrice)) {
      errors.stopPrice = "REQUIRED";
    } else if (isNaN(reqBody.stopPrice)) {
      errors.stopPrice = "ALLOW_NUMERIC";
    } else if (parseFloat(reqBody.stopPrice) <= 0) {
      errors.stopPrice = "ALLOW_POSITIVE_NUMERIC";
    }

    if (isEmpty(reqBody.price)) {
      errors.price = "REQUIRED";
    } else if (isNaN(reqBody.price)) {
      errors.price = "ALLOW_NUMERIC";
    } else if (parseFloat(reqBody.price) <= 0) {
      errors.price = "ALLOW_POSITIVE_NUMERIC";
    }

    if (isEmpty(reqBody.quantity)) {
      errors.quantity = "REQUIRED";
    } else if (isNaN(reqBody.quantity)) {
      errors.quantity = "ALLOW_NUMERIC";
    } else if (parseFloat(reqBody.quantity) <= 0) {
      errors.quantity = "ALLOW_POSITIVE_NUMERIC";
    }

    if (isEmpty(reqBody.buyorsell)) {
      errors.buyorsell = "REQUIRED";
    } else if (!['buy', 'sell'].includes(reqBody.buyorsell)) {
      errors.buyorsell = "INVALID SIDE";
    }

    if (!isEmpty(errors)) {
      return c.json({ "errors": errors }, 400);
    }

    return null; // Continue to next middleware
  }

  /**
   * Stop Market order validation
   * URL : /api/spotOrder
   * METHOD : POST
   * BODY : spotPairId, stopPrice, quantity, buyorsell, orderType
   */
  async stopMarketOrderValidate(c) {
    const errors = {};
    const reqBody = c.get('validatedData');

    if (isEmpty(reqBody.spotPairId)) {
      errors.spotPairId = "REQUIRED";
    } else if (!mongoose.Types.ObjectId.isValid(reqBody.spotPairId)) {
      errors.spotPairId = "Invalid pair";
    }

    if (isEmpty(reqBody.stopPrice)) {
      errors.stopPrice = "REQUIRED";
    } else if (isNaN(reqBody.stopPrice)) {
      errors.stopPrice = "ALLOW_NUMERIC";
    } else if (parseFloat(reqBody.stopPrice) <= 0) {
      errors.stopPrice = "ALLOW_POSITIVE_NUMERIC";
    }

    if (isEmpty(reqBody.quantity)) {
      errors.quantity = "REQUIRED";
    } else if (isNaN(reqBody.quantity)) {
      errors.quantity = "ALLOW_NUMERIC";
    } else if (parseFloat(reqBody.quantity) <= 0) {
      errors.quantity = "ALLOW_POSITIVE_NUMERIC";
    }

    if (isEmpty(reqBody.buyorsell)) {
      errors.buyorsell = "REQUIRED";
    } else if (!['buy', 'sell'].includes(reqBody.buyorsell)) {
      errors.buyorsell = "INVALID SIDE";
    }

    if (!isEmpty(errors)) {
      return c.json({ "errors": errors }, 400);
    }

    return null; // Continue to next middleware
  }

  /**
   * Trailing Stop order validation
   * URL : /api/spotOrder
   * METHOD : POST
   * BODY : spotPairId, distance, quantity, buyorsell, orderType
   */
  async trailingStopOrderValidate(c) {
    const errors = {};
    const reqBody = c.get('validatedData');
    
    if (isEmpty(reqBody.spotPairId)) {
      errors.spotPairId = "REQUIRED";
    } else if (!mongoose.Types.ObjectId.isValid(reqBody.spotPairId)) {
      errors.spotPairId = "Invalid pair";
    }

    if (isEmpty(reqBody.distance)) {
      errors.distance = "REQUIRED";
    } else if (isNaN(reqBody.distance)) {
      errors.distance = "ALLOW_NUMERIC";
    } else if (parseFloat(reqBody.distance) <= 0) {
      errors.distance = "ALLOW_POSITIVE_NUMERIC";
    }

    if (isEmpty(reqBody.quantity)) {
      errors.quantity = "REQUIRED";
    } else if (isNaN(reqBody.quantity)) {
      errors.quantity = "ALLOW_NUMERIC";
    } else if (parseFloat(reqBody.quantity) <= 0) {
      errors.quantity = "ALLOW_POSITIVE_NUMERIC";
    }

    if (isEmpty(reqBody.buyorsell)) {
      errors.buyorsell = "REQUIRED";
    } else if (!['buy', 'sell'].includes(reqBody.buyorsell)) {
      errors.buyorsell = "INVALID SIDE";
    }

    if (!isEmpty(errors)) {
      return c.json({ "errors": errors }, 400);
    }

    return null; 
  }
}

const orderPlaceValidator = new OrderPlaceValidator();

export const decryptValidate = async (c) => await orderPlaceValidator.decryptValidate(c);
export const orderPlaceValidate = async (c) => await orderPlaceValidator.orderPlaceValidate(c);
export const limitOrderValidate = async (c) => await orderPlaceValidator.limitOrderValidate(c);
export const marketOrderValidate = async (c) => await orderPlaceValidator.marketOrderValidate(c);
export const stopLimitOrderValidate = async (c) => await orderPlaceValidator.stopLimitOrderValidate(c);
export const stopMarketOrderValidate = async (c) => await orderPlaceValidator.stopMarketOrderValidate(c);
export const trailingStopOrderValidate = async (c) => await orderPlaceValidator.trailingStopOrderValidate(c);

export { OrderPlaceValidator, orderPlaceValidator };