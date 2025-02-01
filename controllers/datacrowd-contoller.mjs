import session from 'express-session';
import * as model from '../model/datacrowd-model-sqlite-async.mjs';

//Show the home page
export async function home(req, res, next) {
    try {
        const role = await model.getRoleFromUsername(req.session.loggedUserId);
        res.render('home', { session: req.session});
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