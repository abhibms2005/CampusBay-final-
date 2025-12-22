require('dotenv').config();
const mongoose = require('mongoose');

// Import all models
const User = require('./models/User');
const Item = require('./models/Item');
const Message = require('./models/Message');

async function clearDatabase() {
    try {
        // Connect to MongoDB
        console.log('🔗 Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB Atlas\n');

        // Clear all collections
        console.log('🗑️  Clearing all data from collections...\n');

        const userCount = await User.countDocuments();
        await User.deleteMany({});
        console.log(`✅ Deleted ${userCount} users from User collection`);

        const itemCount = await Item.countDocuments();
        await Item.deleteMany({});
        console.log(`✅ Deleted ${itemCount} items from Item collection`);

        const messageCount = await Message.countDocuments();
        await Message.deleteMany({});
        console.log(`✅ Deleted ${messageCount} messages from Message collection`);

        console.log('\n✨ Database cleared successfully!');
        console.log('📊 All collections are now empty. Database structure is preserved.\n');

        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

// Run the function
clearDatabase();
