import session from 'express-session';
import * as model from '../model/datacrowd-model-sqlite-async.mjs';

//Show the home page
export async function home(req, res, next) {
    try {
        req.session.previousPage = req.originalUrl;
       
        res.render('home', { session: req.session});
    }
    catch (error) {
        next(error);
    }
}