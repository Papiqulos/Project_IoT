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

export default router;