import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
    console.log('Loading environment variables from .env file');
  dotenv.config();
}

import { dataCrowdApp} from './app.mjs';

const port = process.env.PORT || 3000;

const server = dataCrowdApp.listen(port, () => {
  console.log(`Server started on http://127.0.0.1:${port}`);
});

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    server.close(() => {
       console.log('Http server closed.');
    });
});