import moment from "moment-timezone";

export const momentFormat = (dateTime = new Date(), format = "YYYY-MM-DD HH:mm", timezone = 'Asia/Kolkata') => {
    try {
        let newDateTime = moment(dateTime).utc();
        let istDateTime = newDateTime.clone().tz(timezone);
        return istDateTime.format(format);
    } catch (err) {
        return "";
    }
};