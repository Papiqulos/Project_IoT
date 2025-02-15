import session from 'express-session'
import dotenv from 'dotenv'
dotenv.config()

let dataCrowdSession

// Set up session middleware
dataCrowdSession = session({
    name: process.env.SESSION_NAME,
    secret: process.env.SESSION_SECRET,
    google_api_key: process.env.GOOGLE_API_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        // To keep the session cookie for 30 days
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: true
    }
});

export default dataCrowdSession;