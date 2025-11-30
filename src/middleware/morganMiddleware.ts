import morgan, { StreamOptions } from 'morgan';
import Logger from '../utils/logger';

// Override the stream method to use our custom Winston logger instead of the default console.log.
const stream: StreamOptions = {
  write: (message) => Logger.http(message.trim()),
};

// Skip logging in non-production environments
const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env !== 'development';
};

const morganMiddleware = morgan(
  // Define the format of the log message. 'tiny', 'short', 'dev', 'common', 'combined' are built-in options
  ':method :url :status :res[content-length] - :response-time ms',
  // Options: in this case, we tell Morgan to use the Winston stream and skip logging if not in dev
  { stream, skip }
);

export default morganMiddleware;