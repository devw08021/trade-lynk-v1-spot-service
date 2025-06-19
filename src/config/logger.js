const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const jsonFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
);

const createDailyLogger = (logDir, level = 'info') => {
    ensureDir(logDir);
    return createLogger({
        level,
        format: jsonFormat,
        transports: [
            new DailyRotateFile({
                filename: path.join(logDir, '%DATE%.log'),
                datePattern: 'DD-MM-YYYY',
                maxSize: '500m',
                maxFiles: '30d',
                zippedArchive: false
            }),
            new transports.Console({
                format: format.combine(format.colorize(), format.simple())
            })
        ]
    });
};

const baseLogPath = path.join(__dirname, '../../../logs');

const errorLogger = createDailyLogger(path.join(baseLogPath, 'error'), 'error');
const mt5Logger = createDailyLogger(path.join(baseLogPath, 'mt5'), 'info');

module.exports = {
    errorLogger,
    mt5Logger
};
