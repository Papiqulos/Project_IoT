import bcrypt from 'bcrypt';

import * as userModel from '../model/datacrowd-model-sqlite-async.mjs';

//Show the register form
export let showRegisterForm = function (req, res) {
    res.render('register', {layout: 'main'});

}

//Register a new user///////////////////////////////
export let doRegister = async function (req, res) {
    try {
        const registrationResult = await userModel.registerUser(req.body.username, req.body.password, req.body.role);
        if (registrationResult.message === "Υπάρχει ήδη χρήστης με αυτό το όνομα") {
            console.log("user already exists");
            res.render('register', {layout: 'main', message: "user already exists"});
        }
        else if (registrationResult.message === "You can't become an admin. KeepYourselfSafe") {
            console.log("You can't become an admin. KeepYourselfSafe");
            res.render('message', {layout: 'main', message: "You can't become an admin. KeepYourselfSafe"});
        }
        else {
            res.redirect('/register_business');
        }
    } 
    catch (error) {
        console.error('registration error: ' + error);

        res.render('home', {layout: 'main', message: "registration error"})
    }
}

//Show the register as a business form
export let showRegisterBusinessForm = function (req, res) {
    
    res.render('register_business', {layout: 'main'});
    
}

//Register a new business////////////////////////////////
export let doRegisterBusiness = async function (req, res) {
    try {
        const registrationResult = await userModel.registerBusiness(req.body.username, 
                                                                    req.body.businessName, 
                                                                    req.body.businessType, 
                                                                    req.body.businessAddress, 
                                                                    req.body.businessPhone, 
                                                                    req.body.businessEmail,
                                                                    req.body.businessWebsite,
                                                                    req.body.businessDescription,
                                                                    req.body.selectedProvisions);
        if (registrationResult.message) {
            console.log("business already exists");
            res.render('register_business', {layout: 'main', message: "business already exists"});
        }
        else {
            res.redirect('/login');
        }
    } 
    catch (error) {
        console.error('registration error: ' + error);

        res.render('home', {layout: 'main', message: "registration error"})
    }
}

//Show the login form
export let showLogInForm = function (req, res) {
    res.render("login", {layout: 'main'});

}

//Login a user
export let doLogin = async function (req, res) {
    //Ελέγχει αν το username και το password είναι σωστά και εκτελεί την
    //συνάρτηση επιστροφής authenticated
    const user = await userModel.getUserByUsername(req.body.username);
    
    if (user == undefined || !user.password || !user.username) {

        
        console.log("user not found");
        res.render('login', {message : "user not found"});
    }
    else {
        console.log("user is", user.username);
        const match = await bcrypt.compare(req.body.password, user.password);
        if (match) {

            req.session.loggedUserId = user.username;     
            console.log("redirecting to " + req.session.previousPage);     
            const redirectTo = req.originalUrl || "/home";
            console.log("redirecting to " + redirectTo);
            res.redirect("/home");
        }
        else {
            
            console.log("password is wrong");
            res.render("login", {message : "password is wrong"})
        }
    }
}

//Logout a user
export let doLogout = (req, res) => {
    //Σημειώνουμε πως ο χρήστης δεν είναι πια συνδεδεμένος
    req.session.destroy();
    res.redirect('/');
}

//Τη χρησιμοποιούμε για να ανακατευθύνουμε στη σελίδα /login όλα τα αιτήματα από μη συνδεδεμένους χρήστες
export let checkAuthenticated = function (req, res, next) {
    //Αν η μεταβλητή συνεδρίας έχει τεθεί, τότε ο χρήστης είναι συνεδεμένος
    if (req.session.loggedUserId) {
        console.log("user is authenticated", req.originalUrl);
        //Καλεί τον επόμενο χειριστή (handler) του αιτήματος
        next();
    }
    else {
        //Ο χρήστης δεν έχει ταυτοποιηθεί, αν απλά ζητάει το /login ή το register δίνουμε τον
        //έλεγχο στο επόμενο middleware που έχει οριστεί στον router
        if ((req.originalUrl === "/login") || (req.originalUrl === "/register")) {
            next()
        }
        else {
            //Στείλε το χρήστη στη "/login" 
            console.log("not authenticated, redirecting to /login")
            res.redirect('/login');
        }
    }
}