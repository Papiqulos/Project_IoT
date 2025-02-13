'use strict';
import { Database } from 'sqlite-async';
import bcrypt from 'bcrypt';
import axios from 'axios';
import dotenv from 'dotenv'
import e, { query } from 'express';
import { InfluxDB, Point } from '@influxdata/influxdb-client';

dotenv.config()
const url = process.env.INFLUXDB_URL;
const token = process.env.INFLUX_TOKEN1;
const org = process.env.INFLUXDB_ORG;
const bucket = "datacrowd";

let queryApi;
// Connect to the InfluxDB
try{
    queryApi = new InfluxDB({url, token}).getQueryApi(org);
    console.log('Connected to the datacrowd InfluxDB.');
}
catch (error) {
    throw Error('Error connecting to the InfluxDB: ' + error);
}
    

let sql;
// Connect to the static database
try {
    sql = await Database.open('data/datacrowd.db');
    console.log('Connected to the static data-crowd database.');
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
        const sources = await sql.all(`SELECT Data_Source.type, Data_Source.source_id, Data_Source.location, Business.business_id, Data_Source.location_n 
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

export let getDataSourceFromLocationN = async function (location_n){
    try {
        const source = await sql.get('SELECT * FROM data_source WHERE location_n = ?', location_n);
        return source;
    } 
    catch (error) {
        throw Error('Error getting source by location_n: ' + error);
    }
}

// Get the data from InfluxDB
// Air Quality for a specific location within a time frame
export let getInfluxDataAirQuality = async function (location_n = "ELTA", start = "2025-02-10T15:36:00.000Z", stop= "2025-02-10T16:42:00.000Z"){
    try {
        const dataSource = await getDataSourceFromLocationN(location_n);
        const fluxQuery = `from(bucket: "${bucket}")
                            |> range(start: ${start}, stop: ${stop})
                            |> filter(fn: (r) => r._measurement == "air_quality_sensor_${location_n}")`;
        const data = [];
        // Add extra fields
        const myQuery = async () => {
            for await (const {values, tableMeta} of queryApi.iterateRows(fluxQuery)) {
                const o = tableMeta.toObject(values)
                o['location_n'] = location_n;
                o['source_id'] = dataSource.source_id;
                o['type'] = dataSource.type;
                o['location'] = dataSource.location;
                data.push(o);
            }
            }
            await myQuery();
            return data;
    } 

    catch (error) {
        throw Error('Error getting InfluxDB data: ' + error);
    }
}

// Access Points for a specific location within a time frame
export let getInfluxDataAccessPoints = async function (location_n = "Stroumpio", start = "2025-02-10T15:36:00.000Z", stop= "2025-02-10T16:42:00.000Z"){
    try {
        const dataSource = await getDataSourceFromLocationN(location_n);
        const fluxQuery = `from(bucket: "${bucket}")
                            |> range(start: ${start}, stop: ${stop})
                            |> filter(fn: (r) => r._measurement == "ap_${location_n}")`;
        const data = [];
        // Add extra fields
        const myQuery = async () => {
            for await (const {values, tableMeta} of queryApi.iterateRows(fluxQuery)) {
                const o = tableMeta.toObject(values)
                o['location_n'] = location_n;
                o['source_id'] = dataSource.source_id;
                o['type'] = dataSource.type;
                o['location'] = dataSource.location;
                // console.log(
                // `${o._time} ${o._measurement} in '${o.co2}' (${o.humidity}): ${o._field}=${o._value}`
                // )
                data.push(o);
            }
            }
            await myQuery();
        return data;
    } 

    catch (error) {
        throw Error('Error getting InfluxDB data: ' + error);
    }
}

// Air Quality for all locations within a time frame
export let getInfluxDataAirQualityAll = async function (start = "2025-02-10T15:36:00.000Z", stop= "2025-02-10T16:42:00.000Z"){
    try {
        
        const fluxQueryCo2 = `from(bucket: "${bucket}")
                            |> range(start: ${start}, stop: ${stop})
                            |> filter(fn: (r) => r["_field"] == "co2" and r._measurement =~ /^air_quality_sensor_.+/)
                            `;

        const fluxQueryHumidity = `from(bucket: "${bucket}")
                            |> range(start: ${start}, stop: ${stop})
                            |> filter(fn: (r) => r["_field"] == "humidity" and r._measurement =~ /^air_quality_sensor_.+/)
                            `;

        const fluxQueryTemperature = `from(bucket: "${bucket}")
                            |> range(start: ${start}, stop: ${stop})
                            |> filter(fn: (r) => r["_field"] == "temperature" and r._measurement =~ /^air_quality_sensor_.+/)
                            `;

        const dataCo2 = [];
        const dataHumidity = [];
        const dataTemperature = [];

        const myQueryCo2 = async () => {
            for await (const {values, tableMeta} of queryApi.iterateRows(fluxQueryCo2)) {
                const o = tableMeta.toObject(values)
                const dataSource = await getDataSourceFromLocationN(o._measurement.split('air_quality_sensor_')[1]);
                if (dataSource == undefined) {
                    continue;
                }
                o['location_n'] = dataSource.location_n;
                o['source_id'] = dataSource.source_id;
                o['type'] = dataSource.type;
                o['location'] = dataSource.location;
                dataCo2.push(o);
            }
        }
        await myQueryCo2();

        const myQueryHumidity = async () => {
            for await (const {values, tableMeta} of queryApi.iterateRows(fluxQueryHumidity)) {
                const o = tableMeta.toObject(values)
                const dataSource = await getDataSourceFromLocationN(o._measurement.split('air_quality_sensor_')[1]);
                if (dataSource == undefined) {
                    continue;
                }
                o['location_n'] = dataSource.location_n;
                o['source_id'] = dataSource.source_id;
                o['type'] = dataSource.type;
                o['location'] = dataSource.location;
                dataHumidity.push(o);
            }
        }
        await myQueryHumidity();

        const myQueryTemperature = async () => {
            for await (const {values, tableMeta} of queryApi.iterateRows(fluxQueryTemperature)) {
                const o = tableMeta.toObject(values)
                const dataSource = await getDataSourceFromLocationN(o._measurement.split('air_quality_sensor_')[1]);
                if (dataSource == undefined) {
                    continue;
                }
                o['location_n'] = dataSource.location_n;
                o['source_id'] = dataSource.source_id;
                o['type'] = dataSource.type;
                o['location'] = dataSource.location;
                dataTemperature.push(o);
            }
        }
        await myQueryTemperature();

        return {co2: dataCo2, humidity: dataHumidity, temperature: dataTemperature};
    } 

    catch (error) {
        throw Error('Error getting InfluxDB data: ' + error);
    }
}

// Access Points for all locations within a time frame
export let getInfluxDataAccessPointsAll = async function (start = "2025-02-10T15:36:00.000Z", stop= "2025-02-10T16:42:00.000Z"){
    try {
        
        const fluxQuery = `from(bucket: "${bucket}")
                            |> range(start: ${start}, stop: ${stop})
                            |> filter(fn: (r) => r["_field"] == "value" and r._measurement =~ /^ap_.+/)
                            `;
        const data = [];
        const myQuery = async () => {
            for await (const {values, tableMeta} of queryApi.iterateRows(fluxQuery)) {
                const o = tableMeta.toObject(values);
                const dataSource = await getDataSourceFromLocationN(o._measurement.split('ap_')[1]);
                if (dataSource == undefined) {
                    continue;
                }
                o['location_n'] = dataSource.location_n;
                o['source_id'] = dataSource.source_id;
                o['type'] = dataSource.type;
                o['location'] = dataSource.location;
                // console.log(
                // `${o._time} ${o._measurement} in '${o.co2}' (${o.humidity}): ${o._field}=${o._value}`
                // )
                data.push(o);
            }
            }
            await myQuery();
            return data;
    } 

    catch (error) {
        throw Error('Error getting InfluxDB data: ' + error);
    }
}

export let getInfluxDataOfBusiness = async function (businessId, start = "2025-02-10T15:36:00.000Z", stop= "2025-02-10T16:42:00.000Z"){
    try {
        const sources = await getBusinessSourcesFromBusinessId(businessId);
        const dataAP = [];
        const dataAQCo2 = [];
        const dataAQHumidity = [];
        const dataAQTemperature = [];
        const airQualityData = await getInfluxDataAirQualityAll(start, stop);
        const accessPointsData = await getInfluxDataAccessPointsAll(start, stop);
        for (const source of sources) {
            if (source.type == 'airquality') {
                // Get all the air quality data for the time frame
                
                const dataCo2 = airQualityData.co2;
                const dataHumidity = airQualityData.humidity;
                const dataTemperature = airQualityData.temperature
                // Filter the data and return only the data that the business has access to for every metric
                dataCo2.forEach(element => {
                    if (element.source_id == source.source_id) {
                        dataAQCo2.push(element);
                    }
                });
                dataHumidity.forEach(element => {
                    if (element.source_id == source.source_id) {
                        dataAQHumidity.push(element);
                    }
                });
                dataTemperature.forEach(element => {
                    if (element.source_id == source.source_id) {
                        dataAQTemperature.push(element);
                    }
                });
                
            } 
            else if (source.type == 'wifi') {
                
                accessPointsData.forEach(element => {
                    if (element.source_id == source.source_id) {
                        dataAP.push(element);
                    }
                });
            }
        }
        return {airQuality: {co2: dataAQCo2, humidity: dataAQHumidity, temperature: dataAQTemperature}, accessPoints: dataAP};
    } 
    catch (error) {
        throw Error('Error getting InfluxDB data: ' + error);
    }
}
