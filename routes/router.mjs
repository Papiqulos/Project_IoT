import express from 'express'
const router = express.Router();

import dotenv from 'dotenv'
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

import * as dataCrowdController from '../controllers/datacrowd-contoller.mjs';
import * as logInController from '../controllers/login-controller-password.mjs';

router.route('/').get((req, res) => { 
    res.redirect('/home') 
});

//Home page
router.get('/home', dataCrowdController.home);

//About page
router.get('/about', dataCrowdController.about);

//Features page
router.get('/features', dataCrowdController.features);

//Roadmap page
router.get('/roadmap', dataCrowdController.roadmap);


//Our Team page
router.get('/team', dataCrowdController.ourTeam);

//FAQ page
router.get('/faq', dataCrowdController.faq);

//Secure fetching of the API key
router.route('/api/key').get(dataCrowdController.getAPIKey);

//Show the login form
router.route('/login').get(logInController.checkAuthenticated, logInController.showLogInForm);
//Login the user
router.route('/login').post(logInController.doLogin);

//Logs out user
router.route('/logout').get(logInController.doLogout);

//Show the register form
router.route('/register').get(logInController.checkAuthenticated, logInController.showRegisterForm);
//Register the user
router.post('/register', logInController.doRegister);

//Show the register as a citizen form
router.route('/register_citizen').get(logInController.showRegisterCitizenForm);
//Register the user as a citizen
router.post('/register_citizen', logInController.doRegisterCitizen);

// Show the register as a business form
router.route('/register_business').get(logInController.showRegisterBusinessForm);
//Register the user as a business
router.post('/register_business', logInController.doRegisterBusiness);


export default router;