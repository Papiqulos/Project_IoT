'use strict';
import { Database } from 'sqlite-async';
import bcrypt from 'bcrypt';

let sql;

// Connect to the database
try {
    sql = await Database.open('data/datacrowd.db');
    console.log('Connected to the gym-chain database.');
} 
catch (error) {
    throw Error('Error connecting to the database: ' + error);
}
