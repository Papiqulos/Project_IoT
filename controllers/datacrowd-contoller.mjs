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

//Show the about page
export async function about(req, res, next) {
    try {
        const role = await model.getRoleFromUsername(req.session.loggedUserId);
        const user = await model.getUserByUsername(req.session.loggedUserId);
        res.render('about', { session: req.session, user: user, role: role });
    }
    catch (error) {
        next(error);
    }
}

//Show the features page
export async function features(req, res, next) {
    try {
        const role = await model.getRoleFromUsername(req.session.loggedUserId);
        const user = await model.getUserByUsername(req.session.loggedUserId);
        res.render('features', { session: req.session, user: user, role: role });
    }
    catch (error) {
        next(error);
    }
}

//Show the roadmap page
export async function roadmap(req, res, next) {
    try {
        const role = await model.getRoleFromUsername(req.session.loggedUserId);
        const user = await model.getUserByUsername(req.session.loggedUserId);
        res.render('roadmap', { session: req.session, user: user, role: role });
    }
    catch (error) {
        next(error);
    }
}

//Show the our_team page
export async function ourTeam(req, res, next) {
    try {
        const role = await model.getRoleFromUsername(req.session.loggedUserId);
        const user = await model.getUserByUsername(req.session.loggedUserId);
        res.render('team', { session: req.session, user: user, role: role });
    }
    catch (error) {
        next(error);
    }
}

//Show the FAQ page
export async function faq(req, res, next) {
    try {
        const role = await model.getRoleFromUsername(req.session.loggedUserId);
        const user = await model.getUserByUsername(req.session.loggedUserId);
        res.render('faq', { session: req.session, user: user, role: role });
    }
    catch (error) {
        next(error);
    }
}

export async function buyAccess(req, res, next) {
    try {
        const user = await model.getUserByUsername(req.session.loggedUserId);
        const business = await model.getBusinessByUsername(req.session.loggedUserId);
        const availableSources = await model.getAvailableSourcesFromBusinessId(business.business_id);
        const businessSources = await model.getBusinessSourcesFromBusinessId(business.business_id);
        res.render('buy_access', { session: req.session, user: user, business: business , availableSources: availableSources, businessSources: businessSources });
    }
    catch (error) {
        next(error);
    }
}

export async function deleteSource(req, res, next) {
    try {
        const source_id = req.params.source_id;
        const business = await model.getBusinessByUsername(req.session.loggedUserId);
        await model.deleteSourceFromBusiness(business.business_id, source_id);
        res.redirect('/buy_access');
    }
    catch (error) {
        next(error);
    }
}

export async function addSource(req, res, next) {
    try {
        const source_id = req.params.source_id;
        const business = await model.getBusinessByUsername(req.session.loggedUserId);
        await model.addSourceToBusiness(business.business_id, source_id);
        res.redirect('/buy_access');
    }
    catch (error) {
        next(error);
    }
}

//Check if admin (FIXME: This function is not used in the routes)
export async function checkAdmin(req, res, next) {  
    try {
        const role = await model.getRoleFromUsername(req.session.loggedUserId);
        if (!role) {
            console.log("Admin access denied, Keep Yourself Safe");
            res.render("message", { message: "Admin access denied, Keep Yourself Safe" });
        }
        if (role.role === 'admin') {
            console.log("Admin access granted");
            next();
        }
        else {
            console.log("Admin access denied, Keep Yourself Safe");
            res.render("message", { message: "Admin access denied, Keep Yourself Safe" });
            // res.redirect('/home');
        }
    }
    catch (error) {
        next(error);
    }
}

//Secure fetching of the API key (FIXME: This function is not used in the routes)
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