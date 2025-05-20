import { pool, getConnection } from "./dbConfig.js";

async function testConnection() {
    let connection;
    try {
        // Get a connection from the pool
        connection = await getConnection();
        console.log("Connected to MySQL!");

        // Example query to test the connection
        const [rows] = await connection.query('SELECT 1 + 1 AS result');
        console.log('Query result:', rows[0]);

        // Keep the connection open for a while to demonstrate
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log("Connection test completed successfully");
    } catch (err) {
        console.error("Error during connection test:", err);
    } finally {
        // Always release the connection back to the pool
        if (connection) {
            connection.release();
            console.log("Connection released back to the pool");
        }
    }
}

// Run the test
testConnection();

// Keep the process running to demonstrate the connection pool
process.on('SIGINT', async () => {
    console.log('Closing all pool connections...');
    await pool.end();
    process.exit(0);
});
