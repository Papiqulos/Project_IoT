import session from 'express-session';
import * as model from '../model/datacrowd-model-sqlite-async.mjs';
import axios from 'axios';
import dotenv from 'dotenv'
dotenv.config()

//Show the home page
export async function home(req, res, next) {
    try {
        const role = await model.getRoleFromUsername(req.session.loggedUserId);
        const user = await model.getUserByUsername(req.session.loggedUserId);
        const googleApiKey = process.env.GOOGLE_API_KEY;
        const location = "38.2470381045693, 21.733589867001573"; // Default location: Patras, Greece

        let airQualityData = await model.getAirQualityData(googleApiKey, location);
        
        


        res.render('home', { session: req.session, user: user, airQualityData: airQualityData, role: role });
    
    }
    catch (error) {
        next(error);

    }
}

export async function checkAdmin(req, res, next) {  
    try {
        const role = await model.getRoleFromUsername(req.session.loggedUserId);
        if (role.role === 'admin') {
            next();
        }
        else {
            res.redirect('/home');
        }
    }
    catch (error) {
        next(error);
    }
}

export async function getAPIKey(req, res, next) {
    try {
        const googleMapsApiKey = process.env.GOOGLE_API_KEY;
        // console.log("API Key Sent:", googleMapsApiKey); // Debugging output
        if (!googleMapsApiKey) {
            return res.status(500).json({ error: "API key not found" });
        }
        res.json({ key: googleMapsApiKey });
    } catch (error) {
        next(error);
    }
}