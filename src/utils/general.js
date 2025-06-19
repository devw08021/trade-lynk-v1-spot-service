import crypto from "crypto"
import CryptoJS from 'crypto-js';
import mongoose from 'mongoose';
import { env } from "../config/env.js";
import isEmpty from './isEmpty.js'

const isValidObjectId = mongoose.Types.ObjectId.isValid;

export const IncCntObjId = (ObjectId) => {
    try {
        ObjectId = ObjectId.toString()
        return parseInt(ObjectId.substring(ObjectId.length - 6, ObjectId.length), 16)
    } catch (err) {
        return ''
    }
}

export const isValidObjId = (ObjectId) => {
    try {
        if (!isValidObjectId(ObjectId)) {
            return false;
        }
        return true
    } catch (err) {
        return ''
    }
}

export const generateOTP = () => {
    const randomBytes = crypto.randomBytes(3)
    if (process.env.NODE_ENV != "production") return "123456"
    const randomNumber = randomBytes.readUIntBE(0, 3) % 1000000
    return randomNumber.toString().padStart(6, "0")
}

export const encryptString = (encryptValue, isSpecialCharacters = false) => {
    try {
        encryptValue = encryptValue.toString()
        let ciphertext = CryptoJS.AES.encrypt(encryptValue, env.SECRET_KEY).toString();
        if (isSpecialCharacters) {
            return replaceSpecialCharacter(ciphertext, 'encrypt')
        }
        return ciphertext
    }
    catch (err) {
        console.log('err: ', err);
        return ''
    }
}

export const decryptString = (decryptValue, isSpecialCharacters = false) => {
    try {
        if (isSpecialCharacters) {
            decryptValue = replaceSpecialCharacter(decryptValue, 'decrypt')
        }
        let bytes = CryptoJS.AES.decrypt(decryptValue, env.SECRET_KEY);
        let originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText
    }
    catch (err) {
        console.log(err)
        return ''
    }
}

export const MT5AccountPassword = (length) => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const special = "@#$%^&*()_+[]{}|;:,.<>?";

    let password = [
        uppercase[Math.floor(Math.random() * uppercase.length)],
        lowercase[Math.floor(Math.random() * lowercase.length)],
        digits[Math.floor(Math.random() * digits.length)],
        special[Math.floor(Math.random() * special.length)]
    ];

    const allCharacters = uppercase + lowercase + digits + special;
    while (password.length < length) {
        password.push(allCharacters[Math.floor(Math.random() * allCharacters.length)]);
    }

    password = password.sort(() => Math.random() - 0.5);

    return password.join('');
}

export const precentConvetPrice = (price, percentage) => {
    price = parseFloat(price);
    percentage = parseFloat(percentage)

    if (!isEmpty(price)) {
        return price * (percentage / 100)
    }
    return 0
}

export const paginationQuery = (query = {}) => {

    let pagination = {
        skip: 0,
        limit: 10,
        page: 1
    }

    if (!isEmpty(query) && !isEmpty(query.page) && !isEmpty(query.limit)) {
        pagination['skip'] = (query.page - 1) * query.limit;
        pagination['limit'] = Number(query.limit)
        pagination['page'] = Number(query.page)
    }

    return pagination;
}

export const filterQuery = (query = {}, project = []) => {
    let filter = {};

    if (!isEmpty(query)) {
        for (const [key, value] of Object.entries(query)) {
            if (key != 'page' && key != 'limit') {
                if (project.includes(key)) {
                    filter[key] = new RegExp(value, 'i');
                }
            }
        }
    }
    return filter;
}