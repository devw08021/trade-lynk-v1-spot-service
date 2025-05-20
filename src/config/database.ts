import mongoose from 'mongoose';
import config from './index' ;

type ConnectionCallback = (status: boolean) => void;

const dbConnection = (cb: ConnectionCallback): void => {

  mongoose.connect(config.DATABASE_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('\x1b[33m%s\x1b[0m', 'MongoDB successfully connected.');
    cb(true);
  })
  .catch((err: unknown) => {
    console.error("-----err", err);
    console.log("\x1b[31m", 'Error on Database connection');
    setTimeout(() => {
      dbConnection(cb);
    }, 1000);
  });
};

export default dbConnection;
