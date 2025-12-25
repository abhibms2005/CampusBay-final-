const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Item = require('./models/Item');
require('dotenv').config();

// Sample Indian college students 
const sampleUsers = [
    { name: 'Priya Sharma', email: 'priya.sharma@bmsce.ac.in', password: 'password123', college: 'BMS College of Engineering' },
    { name: 'Rahul Verma', email: 'rahul.verma@bmsce.ac.in', password: 'password123', college: 'BMS College of Engineering' },
    { name: 'Ananya Patel', email: 'ananya.patel@bmsce.ac.in', password: 'password123', college: 'BMS College of Engineering' },
    { name: 'Arjun Singh', email: 'arjun.singh@bmsce.ac.in', password: 'password123', college: 'BMS College of Engineering' },
    { name: 'Sneha Reddy', email: 'sneha.reddy@bmsce.ac.in', password: 'password123', college: 'BMS College of Engineering' },
    { name: 'Vikram Rao', email: 'vikram.rao@bmsce.ac.in', password: 'password123', college: 'BMS College of Engineering' },
    { name: 'Kavya Iyer', email: 'kavya.iyer@bmsce.ac.in', password: 'password123', college: 'BMS College of Engineering' },
    { name: 'Aditya Kumar', email: 'aditya.kumar@bmsce.ac.in', password: 'password123', college: 'BMS College of Engineering' }
];

// Sample marketplace items with Indian context and SPECIFIC UNIQUE IMAGES
const sampleItems = [
    // Books (Thick textbooks, studying)
    {
        title: 'Engineering Mathematics by BS Grewal',
        description: 'Complete textbook with solved examples. Excellent condition, minimal highlighting.',
        price: 350,
        category: 'Books',
        location: 'Main Gate',
        imageUrl: 'https://loremflickr.com/640/480/textbook,thick?lock=1'
    },
    {
        title: 'Data Structures in C - Tanenbaum',
        description: 'CS semester 3 textbook. Good condition with some notes.',
        price: 280,
        category: 'Books',
        location: 'Library Block',
        imageUrl: 'https://loremflickr.com/640/480/book,used?lock=2'
    },
    {
        title: 'NCERT Physics Class 12',
        description: 'Barely used, perfect for JEE revision.',
        price: 180,
        category: 'Books',
        location: 'Hostel 2',
        imageUrl: 'https://loremflickr.com/640/480/textbook,old?lock=3'
    },
    {
        title: 'Digital Electronics - Morris Mano',
        description: '4th sem ECE textbook. Clean copy.',
        price: 320,
        category: 'Books',
        location: 'ECE Block',
        imageUrl: 'https://loremflickr.com/640/480/electronics,circuit?lock=4'
    },

    // Electronics (Used, gadgets)
    {
        title: 'OnePlus Nord CE 2',
        description: '8GB RAM, 128GB storage. Excellent condition, 11 months old. Charger included.',
        price: 15500,
        category: 'Electronics',
        location: 'Hostel 1',
        imageUrl: 'https://loremflickr.com/640/480/phone,table?lock=5'
    },
    {
        title: 'Realme Buds Air 3',
        description: 'Brand new, sealed pack. Won in college fest.',
        price: 2800,
        category: 'Electronics',
        location: 'Main Gate',
        imageUrl: 'https://loremflickr.com/640/480/earphones,tangled?lock=6'
    },
    {
        title: 'HP Laptop i5 10th Gen',
        description: '8GB RAM, 512GB SSD. Perfect for coding and projects. 2 years old.',
        price: 32000,
        category: 'Electronics',
        location: 'Boys Hostel',
        imageUrl: 'https://loremflickr.com/640/480/laptop,hp?lock=7'
    },
    {
        title: 'JBL Go 3 Speaker',
        description: 'Portable Bluetooth speaker. 6 months old, great sound quality.',
        price: 1800,
        category: 'Electronics',
        location: 'Library',
        imageUrl: 'https://loremflickr.com/640/480/speaker,bluetooth?lock=8'
    },
    {
        title: 'Logitech Wireless Mouse',
        description: 'M235 model, barely used. Battery included.',
        price: 450,
        category: 'Electronics',
        location: 'IT Block',
        imageUrl: 'https://loremflickr.com/640/480/mouse,pad?lock=9'
    },

    // Fashion (Casual student wear)
    {
        title: 'College Uniform Set',
        description: '2 shirts + 2 trousers (M size). Well maintained.',
        price: 800,
        category: 'Fashion',
        location: 'Hostel 3',
        imageUrl: 'https://loremflickr.com/640/480/clothes,ironed?lock=10'
    },
    {
        title: 'Printed Kurta for Girls',
        description: 'Cotton kurta, size L. Perfect for college culturals.',
        price: 550,
        category: 'Fashion',
        location: 'Girls Hostel',
        imageUrl: 'https://loremflickr.com/640/480/dress,casual?lock=11'
    },
    {
        title: 'Formal Shoes - Bata',
        description: 'Black formal shoes, size 9. Worn only 3-4 times.',
        price: 900,
        category: 'Fashion',
        location: 'Main Block',
        imageUrl: 'https://loremflickr.com/640/480/shoes,formal?lock=12'
    },
    {
        title: 'Denim Jacket - Levis',
        description: 'Light blue denim jacket, size M. Trendy and comfortable.',
        price: 1200,
        category: 'Fashion',
        location: 'Canteen Area',
        imageUrl: 'https://loremflickr.com/640/480/jacket,denim?lock=13'
    },

    // Stationery (Specific engineering tools)
    {
        title: 'Scientific Calculator Casio fx-991EX',
        description: 'Perfect for exams, all functions working. With cover.',
        price: 650,
        category: 'Stationery',
        location: 'Admin Block',
        imageUrl: 'https://loremflickr.com/640/480/calculator,desk?lock=14'
    },
    {
        title: 'DS Class Notes',
        description: 'Toppers Handwritten Notes.',
        price: 250,
        category: 'Stationery',
        location: 'Stationary Shop',
        imageUrl: 'https://loremflickr.com/640/480/notebook,spiral?lock=15'
    },
    {
        title: 'Parker Pen Set',
        description: 'Blue and black Parker pens with refills. Premium quality.',
        price: 380,
        category: 'Stationery',
        location: 'Library',
        imageUrl: 'https://loremflickr.com/640/480/pen,luxury?lock=16'
    },
    {
        title: 'Engineering Drawing Set',
        description: 'Complete set with compass, protractor, scales. Rarely used.',
        price: 420,
        category: 'Stationery',
        location: 'Mechanical Block',
        imageUrl: 'https://loremflickr.com/640/480/engineering,tools?lock=17'
    },

    // Furniture (Dorm room items)
    {
        title: 'Study Table with Chair',
        description: 'Wooden study table + revolving chair. Perfect for hostel room.',
        price: 2500,
        category: 'Furniture',
        location: 'Hostel room',
        imageUrl: 'https://loremflickr.com/640/480/desk,study?lock=18'
    },
    {
        title: 'Book Shelf - 4 Tier',
        description: 'Metal bookshelf, holds 50+ books. Compact design.',
        price: 1200,
        category: 'Furniture',
        location: 'Hostel 2',
        imageUrl: 'https://loremflickr.com/640/480/bookshelf,furniture?lock=19'
    },
    {
        title: 'Mattress Single Bed',
        description: 'Foam mattress 6 inch thick. Clean and well maintained.',
        price: 1800,
        category: 'Furniture',
        location: 'Hostel Market',
        imageUrl: 'https://loremflickr.com/640/480/mattress,messy?lock=20'
    },
    {
        title: 'Wall Clock Digital',
        description: 'Large display digital wall clock with alarm. Battery operated.',
        price: 350,
        category: 'Furniture',
        location: 'Hostel 1',
        imageUrl: 'https://loremflickr.com/640/480/clock,digital?lock=21'
    },

    // Other / Misc (Student hobbies)
    {
        title: 'Guitar - Yamaha F280',
        description: 'Acoustic guitar in excellent condition. Comes with bag and picks.',
        price: 6500,
        category: 'General',
        location: 'Music Room',
        imageUrl: 'https://loremflickr.com/640/480/guitar,acoustic?lock=22'
    },
    {
        title: 'Badminton Racket Yonex',
        description: 'Professional racket with cover. Barely used.',
        price: 1100,
        category: 'General',
        location: 'Sports Complex',
        imageUrl: 'https://loremflickr.com/640/480/shuttlecock,racket?lock=44'
    },
    {
        title: 'Cycle - Hero Sprint',
        description: '21 gear cycle, 2 years old. Well maintained.',
        price: 4200,
        category: 'General',
        location: 'Cycle Stand',
        imageUrl: 'https://loremflickr.com/640/480/bicycle,sport?lock=24'
    },
    {
        title: 'Water Bottle Milton 1L',
        description: 'Insulated water bottle, keeps water cold for 24hrs.',
        price: 280,
        category: 'General',
        location: 'BMSETH Mess',
        imageUrl: 'https://media-uk.landmarkshops.in/cdn-cgi/image/h=550,w=550,q=85,fit=cover/homecentre/1000012541085-1000012541084_01-2100.jpg'
    }
];

async function seedDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n📝 Ensuring users exist...');
        const createdUsers = [];
        const passwordHash = bcrypt.hashSync('password123', 10);

        for (const userData of sampleUsers) {
            let user = await User.findOne({ email: userData.email.toLowerCase() });
            if (!user) {
                user = new User({
                    name: userData.name,
                    email: userData.email.toLowerCase(),
                    passwordHash: passwordHash,
                    college: userData.college,
                    verified: true
                });
                await user.save();
                console.log(`   ✅ Created User: ${userData.name}`);
            } else {
                console.log(`   ⏭️  User ${userData.name} already exists`);
            }
            createdUsers.push(user);
        }

        console.log('\n📦 Updating marketplace items with unique images...');
        let updatedCount = 0;

        for (const itemData of sampleItems) {
            // Find existing item by title or update if it exists
            let item = await Item.findOne({ title: itemData.title });

            if (item) {
                // Update existing item's image and other details
                item.imageUrl = itemData.imageUrl;
                item.category = itemData.category;
                item.description = itemData.description;
                item.price = itemData.price;
                await item.save();
                console.log(`   🔄 Updated: ${itemData.title}`);
                updatedCount++;
            } else {
                // Create new if it doesn't exist
                const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                item = new Item({
                    ...itemData,
                    seller: randomUser._id,
                    availabilityStatus: 'AVAILABLE'
                });
                await item.save();
                console.log(`   ✅ Created: ${itemData.title}`);
                updatedCount++;
            }
        }

        console.log(`\n🎉 Image transformation complete!`);
        console.log(`   📦 ${updatedCount} items now have beautiful, unique images.`);
        console.log('\n✨ Refresh your marketplace to see the difference!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during image update:', error);
        process.exit(1);
    }
}

seedDatabase();
