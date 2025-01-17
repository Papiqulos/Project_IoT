import bcrypt from 'bcrypt';

import * as userModel from '../model/datacrowd-model-sqlite-async.mjs';

//Show the login form
export let showLogInForm = function (req, res) {
    res.render("login", {layout: 'main'});

}

//Show the register form
export let showRegisterForm = function (req, res) {
    res.render('createAccount', {layout: 'main'});

}

//Register a new user
export let doRegister = async function (req, res) {
    try {
        const registrationResult = await userModel.registerUser(req.body.fname, req.body.lname, req.body.username, req.body.password, req.body.email);
        if (registrationResult.message) {
            console.log("user already exists");
            res.render('createAccount', {layout: 'main', message: "user already exists"});
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
            res.redirect(req.session.previousPage);
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
        if ((req.originalUrl === "/login") || (req.originalUrl === "/createAccount")) {
            next()
        }
        else {
            //Στείλε το χρήστη στη "/login" 
            console.log("not authenticated, redirecting to /login")
            res.redirect('/login');
        }
    }
}