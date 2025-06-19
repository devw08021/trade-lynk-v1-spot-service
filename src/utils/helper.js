export const splitPair = (pairs, quote) => {
    return pairs.map(pair => {
        const quoteCurrency = quote.find(quote => pair.endsWith(quote));
        if (!quoteCurrency) {
            return { pair, baseCurrency: null, quoteCurrency: null, error: "Unknown quote currency" };
        }
        const baseCurrency = pair.slice(0, pair.length - quoteCurrency.length);
        return { pair, baseCurrency, quoteCurrency };
    });
}

export const replacePair = (currencySymbol) => {
    switch (currencySymbol) {
        case "USD": return "USDT"
        default: return currencySymbol
    }
}

export const convertPairArray = (data, suffix) => {
    const splitKey = (key) => {
        const currency = suffix.find((suffix) => key.endsWith(suffix));
        if (currency) {
            const base = key.replace(currency, "");
            return { base, currency };
        }
        return { base: key, currency: null };
    };

    const processedData = Object.entries(data).map(([key, value]) => {
        const { base, currency } = splitKey(key);
        return { base, currency, value };
    });

    return processedData
}