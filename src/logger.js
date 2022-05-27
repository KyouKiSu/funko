import { format, createLogger, transports } from "winston";
let buildLogger = function (folder='./logs',accountName = 'noname') {

  const { timestamp, combine, printf, errors } = format;

  const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}]\t[${accountName}]\t[${level}]: ${stack || message}`;
  });

  const loggers = {
    logScreen: null,
  }

  loggers.logScreen = createLogger({
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    transports: [
      new transports.Console({level:"info"}),
      new transports.File({filename:`${folder}\\${accountName}_screen.log`}),
    ],
  });

  return loggers
};
export default buildLogger;