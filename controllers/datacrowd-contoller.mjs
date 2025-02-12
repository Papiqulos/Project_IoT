import session from 'express-session';
import * as model from '../model/datacrowd-model-sqlite-async.mjs';
import axios from 'axios';
import dotenv from 'dotenv'
dotenv.config()

//eyyo
export async function eyyo(req, res, next) {
    try{
        res.render('eyyo');
    }
    catch (error) {
        next(error);
    }
}

//Show the home page
export async function home(req, res, next) {
    const user = await model.getUserByUsername(req.session.loggedUserId);
    let influxDataAirQualityAll, influxDataAccessPointsAll, business;
    
    try {
        if (!user) {
            console.log("User not found");
            res.render('home', { session: req.session, 
                user: user,
                business: business,  
                influxData: { airQuality: 0, accessPoints: 0 } });
        }
        else{
            if (user.role === "citizen") {
                console.log("home");
                const event = req.query.event;
                
                if (event){
                    // console.log("Event: ", event);
                    const start = event.split("|")[1];
                    const stop = event.split("|")[2];
                    // console.log("Start: ", start);
                    // console.log("Stop: ", stop);
                    const startn = new Date(new Date().getTime() + (-60) * 60 * 1000);
                    const stopn = new Date(startn.getTime() + 60 * 60 * 1000);
                    // console.log("Startn: ", startn);
                    // console.log("Stopn: ", stopn);
                    influxDataAccessPointsAll =  await model.getInfluxDataAccessPointsAll(start, stop);
                    influxDataAirQualityAll = await model.getInfluxDataAirQualityAll(start, stop);
                    if (influxDataAirQualityAll.co2.length === 0){
                        console.log("adeioAQ");
                        influxDataAirQualityAll = await model.getInfluxDataAirQualityAll(startn.toISOString(), stopn.toISOString());
                    }
                    if (influxDataAccessPointsAll.length === 0){
                        console.log("adeioAP");
                        influxDataAccessPointsAll = await model.getInfluxDataAccessPointsAll(startn.toISOString(), stopn.toISOString());
                    }
                }else {
                    // const influxDataAirQualityELTA = await model.getInfluxDataAirQuality();
                    // console.log("Influx Data Air Quality: ", influxDataAirQualityELTA[600]);

                    // const influxDataAccessPointsStroumpio = await model.getInfluxDataAccessPoints();
                    // console.log("Influx Data Access Points: ", influxDataAccessPointsStroumpio[0]);

                    // Get the default data for the heatmap
                    influxDataAirQualityAll = await model.getInfluxDataAirQualityAll();
                    // console.log("Influx Data Air Quality All: ", influxDataAirQualityAll);

                    influxDataAccessPointsAll = await model.getInfluxDataAccessPointsAll();
                    // console.log("Influx Data Access Points All: ", influxDataAccessPointsAll);
                    
                }
            }
            else if (user.role === "business") {
                business = await model.getBusinessByUsername(req.session.loggedUserId);
                const influxDataOfBusiness = await model.getInfluxDataOfBusiness(business.business_id);
                influxDataAirQualityAll = influxDataOfBusiness.airQuality;
                influxDataAccessPointsAll = influxDataOfBusiness.accessPoints;
                console.log("AQ of business: ", influxDataAirQualityAll.length);
                console.log("AP of business ", influxDataAccessPointsAll.length);
            }
            else if (user.role === "admin") {
                console.log("Admin home");
            }
            res.render('home', { session: req.session, 
                user: user,  
                business: business,
                influxData: { airQuality: influxDataAirQualityAll, accessPoints: influxDataAccessPointsAll } });
        }
        

        
    
    }
    catch (error) {
        next(error);

    }
}

//Show the heatmap page
export async function heatmap(req, res, next) {
    try {
        const user = await model.getUserByUsername(req.session.loggedUserId);
        const start = req.params.start;
        const stop = req.params.stop;
        console.log("Start: ", start);
        console.log("Stop: ", stop);
        const influxDataAirQualityAll = await model.getInfluxDataAirQualityAll(start, stop);
        const influxDataAccessPointsAll = await model.getInfluxDataAccessPointsAll(start, stop);
        res.render('home', { session: req.session, 
                            user: user, 
                            influxData: { airQuality: influxDataAirQualityAll, accessPoints: influxDataAccessPointsAll } });
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

// Buy Access page
export async function buyAccess(req, res, next) {
    try {
        const user = await model.getUserByUsername(req.session.loggedUserId);
        const business = await model.getBusinessByUsername(req.session.loggedUserId);
        const availableSources = await model.getAvailableSourcesFromBusinessId(business.business_id);
        const allSources = await model.getAllDataSources();
        const businessSources = await model.getBusinessSourcesFromBusinessId(business.business_id);
        res.render('buy_access', { session: req.session, user: user, business: business , availableSources: availableSources, businessSources: businessSources });
    }
    catch (error) {
        next(error);
    }
}

// Delete a source from the business
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

// Add a source to the business
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