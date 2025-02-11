'use strict';
import { Database } from 'sqlite-async';
import bcrypt from 'bcrypt';
import axios from 'axios';
import dotenv from 'dotenv'
import e from 'express';
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
export let registerUser = async function (username, password, role, email, phone_number) {
    // ελέγχουμε αν υπάρχει χρήστης με αυτό το username
    const userId = await getUserByUsername(username);

    //If the user already exists
    if (userId != undefined) {
        return { message: "Υπάρχει ήδη χρήστης με αυτό το όνομα" };
    } 
    //If the user does not exist
    else {
        try {
            
            //Check if the role is admin
            if (role == 'admin') {
                return { message: "You can't become an admin. KeepYourselfSafe" };
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Add to User table
            const stmt = await sql.prepare('INSERT INTO User VALUES (?, ?, ?, ?, ?)');
            const info = await stmt.run(hashedPassword, username, role, email, phone_number);

            return info.lastID;
        } 
        catch (error) {
            throw error;
        }
    }
}

//Create a new citizen
export let registerCitizen = async function (citizenName, 
                                            citizenAddress, 
                                            citizenZIP, 
                                            citizenCity, 
                                            citizenUsername) {
    console.log('registerCitizen');
    try{
        
        // Add to Citizen table
        const stmt = await sql.prepare('INSERT INTO Citizen ( name, address,username, ZIP, city) VALUES (?, ?, ?, ?, ?)');
        const info = await stmt.run(citizenName, citizenAddress, citizenUsername,citizenZIP, citizenCity);
        return info.lastID;
        
    }
    catch (error) {
        throw Error('Error registering citizen: ' + error);
    }
}

//Create a new business
export let registerBusiness = async function (businessAddress, 
                                              businessName, 
                                              businessType, 
                                              businessUsername,
                                              businessZIP,
                                              businessCity) {
    
    console.log('registerBusiness');
    try{
        //Check if the business already exists
        const business = await sql.get('SELECT * FROM business WHERE name = ?', businessName);
        if (business != undefined) {
            return { message: "Business already exists" };
        } 
        else {
            // Add to Business table
            const stmt = await sql.prepare('INSERT INTO Business ( address, name, type, username, ZIP, city) VALUES (?, ?, ?, ?, ?, ?)');
            const info = await stmt.run(businessAddress, businessName, businessType, businessUsername, businessZIP, businessCity);
            return info.lastID;
        }
    }
    catch (error) {
        throw Error('Error registering business: ' + error);
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

export let getAllDataSources = async function (){
    try {
        const sources = await sql.all('SELECT * FROM Data_Source');
        return sources;
    } 
    catch (error) {
        throw Error('Error getting all data sources: ' + error);
    }
}

// Get the sources that the business has access to
export let getBusinessSourcesFromBusinessId = async function (businessId){
    try {
        const sources = await sql.all(`SELECT Data_Source.type, Data_Source.source_id, Data_Source.location, Business.business_id 
                                        From Data_Source JOIN Has_Access JOIN Business On Data_Source.source_id = Has_Access.source_id and Business.business_id = Has_Access.business_id 
                                        WHERE Business.business_id = ?`, businessId);
        return sources;
    } 
    catch (error) {
        throw Error('Error getting business sources: ' + error);
    }
}

// Get the sources that the business does not have access to
export let getAvailableSourcesFromBusinessId = async function (businessId){
    try {
        const sources = await sql.all(`SELECT *
                                        FROM Data_Source
                                        WHERE (type, source_id, location, location_n )NOT IN (
                                            SELECT Data_Source.type, Data_Source.source_id, Data_Source.location, Data_Source.location_n
                                            From Data_Source JOIN Has_Access JOIN Business On Data_Source.source_id = Has_Access.source_id and Business.business_id = Has_Access.business_id 
                                            WHERE Business.business_id = ? 

                                        )`, businessId);
        return sources;
    } 
    catch (error) {
        throw Error('Error getting business sources: ' + error);
    }
}

// Add a source to the business
export let addSourceToBusiness = async function (businessId, sourceId){
    try {
        const stmt = await sql.prepare('INSERT INTO Has_Access (business_id, source_id) VALUES (?, ?)');
        const info = await stmt.run(businessId, sourceId);
        return info.lastID;
    } 
    catch (error) {
        throw Error('Error adding source to business: ' + error);
    }
}

// Delete a source from the business
export let deleteSourceFromBusiness = async function (businessId, sourceId){
    try {
        const stmt = await sql.prepare('DELETE FROM Has_Access WHERE business_id = ? AND source_id = ?');
        const info = await stmt.run(businessId, sourceId);
        return info.lastID;
    } 
    catch (error) {
        throw Error('Error deleting source from business: ' + error);
    }
}

export let getBusinessByUsername = async function (username){
    try {
        const business = await sql.get('SELECT * FROM business WHERE username = ?', username);
        return business;
    } 
    catch (error) {
        throw Error('Error getting business by username: ' + error);
    }
}

export let getCitizenByUsername = async function (username){
    try {
        const citizen = await sql.get('SELECT * FROM citizen WHERE username = ?', username);
        return citizen;
    } 
    catch (error) {
        throw Error('Error getting citizen by username: ' + error);
    }
}