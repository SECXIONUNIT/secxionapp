import winston from "winston";
import morgan from "morgan";
import path from "path";
import fs from "fs";

const { combine, timestamp, printf, colorize, align, json, errors } =
  winston.format;

// Ensure logs directory exists
const logsDir = "./logs";
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom log format for the console
const consoleLogFormat = printf(({ level, message, timestamp, ...meta }) => {
  let metaStr = "";
  if (Object.keys(meta).length > 0 && meta.stack === undefined) {
    metaStr = JSON.stringify(meta, null, 2);
  }
  return `${timestamp} [${level}]: ${message}${metaStr ? "\n" + metaStr : ""}`;
});

// Custom log format for files
const fileLogFormat = printf(({ level, message, timestamp, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta,
  });
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    align(),
  ),
  defaultMeta: { service: "secxion-backend" },
  transports: [
    // Console transport - colored output
    new winston.transports.Console({
      format: combine(colorize({ all: true }), consoleLogFormat),
    }),

    // Error logs - separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileLogFormat,
      maxsize: 10485760, // 10 MB
      maxFiles: 5,
    }),

    // Combined logs - all events
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: fileLogFormat,
      maxsize: 10485760, // 10 MB
      maxFiles: 5,
    }),

    // API request logs
    new winston.transports.File({
      filename: path.join(logsDir, "api.log"),
      level: "http",
      format: fileLogFormat,
      maxsize: 10485760, // 10 MB
      maxFiles: 3,
    }),

    // Database operation logs
    new winston.transports.File({
      filename: path.join(logsDir, "database.log"),
      format: fileLogFormat,
      maxsize: 10485760, // 10 MB
      maxFiles: 3,
    }),

    // Auth event logs (security sensitive)
    new winston.transports.File({
      filename: path.join(logsDir, "auth.log"),
      format: fileLogFormat,
      maxsize: 10485760, // 10 MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
  // Exception/rejection handlers disabled in dev — sandbox blocks uv_uptime syscall
  ...(process.env.NODE_ENV === "production" && {
    exceptionHandlers: [
      new winston.transports.File({ filename: path.join(logsDir, "exceptions.log") }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: path.join(logsDir, "rejections.log") }),
    ],
  }),
});

// Add custom log levels
logger.levels = {
  ...logger.levels,
  database: 2,
  auth: 2,
  performance: 3,
};

// Custom logging methods for different contexts
logger.logAuth = (action, userId, status, details = {}) => {
  logger.info(`[AUTH] ${action}`, {
    context: "auth",
    action,
    status,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

logger.logDB = (
  operation,
  collection,
  status,
  executionTime = 0,
  details = {},
) => {
  logger.info(`[DB] ${operation} on ${collection}`, {
    context: "database",
    operation,
    collection,
    status,
    executionTime: `${executionTime}ms`,
    ...details,
  });
};

logger.logAPI = (method, endpoint, status, responseTime = 0, details = {}) => {
  logger.http(`[API] ${method} ${endpoint} - ${status}`, {
    context: "api",
    method,
    endpoint,
    status,
    responseTime: `${responseTime}ms`,
    ...details,
  });
};

logger.logError = (errorType, message, error = null, context = {}) => {
  logger.error(`[${errorType}] ${message}`, {
    context: "error",
    errorType,
    ...context,
  });
};

logger.logPerformance = (operation, duration, details = {}) => {
  if (duration > 1000) {
    logger.warn(`[PERF] Slow operation: ${operation} took ${duration}ms`, {
      context: "performance",
      operation,
      duration,
      ...details,
    });
  } else {
    logger.debug(`[PERF] ${operation} completed in ${duration}ms`, {
      context: "performance",
      operation,
      duration,
      ...details,
    });
  }
};

// Utility to sanitize sensitive data from logs
export const sanitizeData = (data, sensitiveFields = []) => {
  if (!data) return data;

  const sanitized = { ...data };
  const fieldsToRedact = [
    "password",
    "token",
    "secret",
    "apiKey",
    "creditCard",
    "ssn",
    "email",
    ...sensitiveFields,
  ];

  const redact = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (
        fieldsToRedact.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        obj[key] = "[REDACTED]";
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        redact(obj[key]);
      }
    });
  };

  redact(sanitized);
  return sanitized;
};

// Morgan middleware for HTTP request logging
const morganFormat =
  ":method :url :status :res[content-length] - :response-time ms - :user-agent";

export const requestLogger = morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.http(message.trim());
    },
  },
});

// Middleware to add request/response logging
export const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Store original send function
  const originalSend = res.send;

  // Override send to log response
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const sanitized = sanitizeData({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
    });

    if (res.statusCode >= 400) {
      logger.error(
        `[API] ${req.method} ${req.url} - ${res.statusCode}`,
        sanitized,
      );
    } else if (duration > 1000) {
      logger.warn(
        `[API] Slow request: ${req.method} ${req.url} took ${duration}ms`,
      );
    } else {
      logger.info(`[API] ${req.method} ${req.url} - ${res.statusCode}`);
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

export default logger;
