require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});