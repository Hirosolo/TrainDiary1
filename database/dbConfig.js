import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({path: "D:/Code/Web/TrainDiary/database/.env"});

console.log("Loaded env vars in dbConfig.js:");
console.log("MYSQL_HOST:", process.env.MYSQL_HOST);
console.log("MYSQL_USER:", process.env.MYSQL_USER);
console.log("MYSQL_PASSWORD:", process.env.MYSQL_PASSWORD);
console.log("MYSQL_DATABASE:", process.env.MYSQL_DATABASE);

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const getConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log("Successfully connected to MySQL");
        return connection;
    } catch (err) {
        console.error("Error connecting to MySQL:", err);
        throw err;
    }
};

// Export both the pool and getConnection function
export { pool, getConnection };

