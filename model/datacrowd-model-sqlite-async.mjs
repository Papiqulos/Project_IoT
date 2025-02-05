'use strict';
import { Database } from 'sqlite-async';
import bcrypt from 'bcrypt';
import axios from 'axios';
import dotenv from 'dotenv'
dotenv.config()

let sql;

// Connect to the database
try {
    sql = await Database.open('data/datacrowd.db');
    console.log('Connected to the data-crowd log-in database.');
} 
catch (error) {
    throw Error('Error connecting to the database: ' + error);
}


export let getRoleFromUsername = async function (username){
    try {
        const role = await sql.get('SELECT role FROM user WHERE username = ?', username);
        return role;
    } 
    catch (error) {
        throw Error('Error getting role from username: ' + error);
    }
}

export let getAirQualityData = async function (googleApiKey, location) {
    const lat = parseFloat(location.split(',')[0]);
    const lng = parseFloat(location.split(',')[1]);
  
    try {
      const response = await axios.post(
        `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${googleApiKey}`,
        {
          location: {
            latitude: lat, // Latitude from the location
            longitude: lng, // Longitude from the location
          },
        //   extraComputations: ['HEALTH_RECOMMENDATIONS'], // Optional: Add extra computations
          languageCode: 'en', // Optional: Set the language
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
  
      // Return the API response data
      return response.data;
    } catch (error) {
      // Throw an error if the request fails
      throw new Error('Error getting air quality data: ' + (error.response?.data || error.message));
    }
  };

//Create a new user
export let registerUser = async function (username, password, role) {
    // ελέγχουμε αν υπάρχει χρήστης με αυτό το username
    const userId = await getUserByUsername(username);

    //If the user already exists
    if (userId != undefined) {
        return { message: "Υπάρχει ήδη χρήστης με αυτό το όνομα" };
    } 
    //If the user does not exist
    else {
        try {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Add to User table
            const stmt = await sql.prepare('INSERT INTO user VALUES (?, ?, ?)');
            const info = await stmt.run(username, hashedPassword, role);

            return info.lastID;
        } 
        catch (error) {
            throw error;
        }
    }
}

export let getUserByUsername = async function (username){
    try {
        const user = await sql.get('SELECT * FROM user WHERE username = ?', username);
        return user;
    } 
    catch (error) {
        throw Error('Error getting user by username: ' + error);
    }
}
