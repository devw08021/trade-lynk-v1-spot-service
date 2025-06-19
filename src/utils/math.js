export const trunc = (x, n) => {
    try {
        if (x === null || x === undefined) {
            console.error("trunc received null/undefined");
            return "0";
        }
        const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g");
        const matchResult = x.toString().match(reg);
        if (!matchResult) {
            console.error("trunc regex failed for", x);
            return "0";
        }
        const a = matchResult[0];
        const dot = a.indexOf(".");

        if (dot === -1) {
            return a + "." + "0".repeat(n);
        }

        const b = n - (a.length - dot) + 1;
        return b > 0 ? a + "0".repeat(b) : a;
    } catch (err) {
        console.log(err);
        return "0";
    }
};

export const mult = (val1, precision1, val2, precision2) => {
    try {
        let a = trunc(parseFloat(val1), precision1).split(".").join("");
        let b = trunc(parseFloat(val2), precision2).split(".").join("");
        return (parseInt(a) * parseInt(b)) / (10 ** precision1 * 10 ** precision2);
    } catch (err) {
        console.log("file: math.js:83  mult  err", err);
        return 0;
    }
};

export const div = (val1, val2, precision) => {
    try {
        if (parseFloat(val2) === 0) {
            console.error("Division by zero detected!");
            return 0;
        }
        let a = trunc(parseFloat(val1), precision).split(".").join("");
        let b = trunc(parseFloat(val2), precision).split(".").join("");
        return parseInt(a) / parseInt(b);
    } catch (err) {
        console.log("file: math.js:93  div  err", err);
        return 0;
    }
};

export const sub = (val1, val2, precision) => {
    try {
        let a = trunc(parseFloat(val1), precision).split(".").join("");
        let b = trunc(parseFloat(val2), precision).split(".").join("");
        return (parseInt(a) - parseInt(b)) / 10 ** precision;
    } catch (err) {
        console.log("file: math.js:103  sub  err", err);
        return 0;
    }
};

export const add = (val1, val2, precision) => {
    try {
        let a = trunc(parseFloat(val1), precision).split(".").join("");
        let b = trunc(parseFloat(val2), precision).split(".").join("");
        return (parseInt(a) + parseInt(b)) / 10 ** precision;
    } catch (err) {
        console.error("file: math.js:116  add  err", err);
        return 0;
    }
};