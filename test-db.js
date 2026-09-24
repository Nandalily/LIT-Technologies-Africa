const sequelize = require("./config/db");

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log("✅ Connected to Supabase PostgreSQL");
    } catch (error) {
        console.error("❌ Database connection failed");
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

testConnection();