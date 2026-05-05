const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load models
const User = require('./models/User');
const Hall = require('./models/Hall');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');
const Review = require('./models/Review');
const Visitor = require('./models/Visitor');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const demoUsers = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin@1234',
    role: 'admin',
    phone: '+1234567890',
    address: '123 Admin Street, City, State 12345'
  },
  {
    name: 'John Hall Owner',
    email: 'john.owner@example.com',
    password: 'Owner@1234',
    role: 'hall_owner',
    isActive: true,
    phone: '+1234567891',
    address: '456 Owner Ave, City, State 12346'
  },
  {
    name: 'Sarah Hall Owner',
    email: 'sarah.owner@example.com',
    password: 'Owner@1234',
    role: 'hall_owner',
    isActive: true,
    phone: '+1234567892',
    address: '789 Owner Blvd, City, State 12347'
  },
  {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'User@1234',
    role: 'user',
    phone: '+1234567893',
    address: '321 User St, City, State 12348'
  },
  {
    name: 'Bob Smith',
    email: 'bob@example.com',
    password: 'User@1234',
    role: 'user',
    phone: '+1234567894',
    address: '654 User Ave, City, State 12349'
  }
];

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Hall.deleteMany();
    await Booking.deleteMany();
    await Payment.deleteMany();
    await Review.deleteMany();
    await Visitor.deleteMany();

    console.log('Existing data cleared');

    // Create users
    const users = await User.create(demoUsers);

    console.log('Users created');

    // Create halls
    const halls = await Hall.create([
      {
        ownerId: users[1]._id, // John Hall Owner
        name: 'Grand Conference Hall',
        description: 'A polished corporate venue with breakout corners, full AV support, and a premium lobby built for conferences, launches, and executive seminars.',
        capacity: 200,
        pricePerHour: 150,
        location: 'Downtown Business District, Chennai',
        placeDetails: {
          addressLine: '12 Marina Tech Boulevard',
          area: 'Anna Salai',
          city: 'Chennai',
          state: 'Tamil Nadu',
          landmark: 'Near Express Avenue Mall',
          mapLabel: 'Central business zone with quick metro access',
          parkingInfo: 'Basement parking for 70 cars plus valet support',
        },
        amenities: ['Projector', 'Sound System', 'WiFi', 'Air Conditioning', 'Parking', 'LED Wall', 'Green Room'],
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
        imageGallery: [
          'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
        ],
        hallType: 'Conference',
        availabilityStatus: true
      },
      {
        ownerId: users[1]._id, // John Hall Owner
        name: 'Elegant Banquet Hall',
        description: 'A large celebration venue designed for weddings, receptions, and cultural events, with stage lighting, dining flexibility, and elegant interiors.',
        capacity: 300,
        pricePerHour: 200,
        location: 'Uptown Plaza, Coimbatore',
        placeDetails: {
          addressLine: '88 Celebration Road',
          area: 'RS Puram',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          landmark: 'Opposite Brookefields',
          mapLabel: 'High-demand wedding district with hotel cluster nearby',
          parkingInfo: 'Open parking for 120 vehicles and bus drop lane',
        },
        amenities: ['Catering Kitchen', 'Dance Floor', 'Stage', 'Sound System', 'Valet Parking', 'Bridal Suite', 'Dining Hall'],
        image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
        imageGallery: [
          'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
        ],
        hallType: 'Banquet',
        availabilityStatus: true
      },
      {
        ownerId: users[2]._id, // Sarah Hall Owner
        name: 'Modern Auditorium',
        description: 'A high-capacity auditorium for keynote sessions, performances, convocation events, and large public gatherings with professional-grade acoustics.',
        capacity: 500,
        pricePerHour: 250,
        location: 'University Campus, Bengaluru',
        placeDetails: {
          addressLine: '5 Knowledge Park Avenue',
          area: 'Electronic City',
          city: 'Bengaluru',
          state: 'Karnataka',
          landmark: 'Beside Infosys Gate 2',
          mapLabel: 'Campus-side venue with wide arterial road access',
          parkingInfo: 'Surface parking for 150 cars and two coach bays',
        },
        amenities: ['HD Projector', 'Surround Sound', 'Stage Lighting', 'Microphones', 'Recording Equipment', 'Backstage Access', 'Live Streaming Booth'],
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
        imageGallery: [
          'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1503428593586-e225b39bddfe?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
        ],
        hallType: 'Auditorium',
        availabilityStatus: true
      },
      {
        ownerId: users[2]._id, // Sarah Hall Owner
        name: 'Cozy Seminar Room',
        description: 'A compact but premium seminar space for workshops, coaching sessions, interviews, and focused team discussions with flexible seating.',
        capacity: 50,
        pricePerHour: 80,
        location: 'Tech Park, Hyderabad',
        placeDetails: {
          addressLine: '41 Innovation Hub Street',
          area: 'HITEC City',
          city: 'Hyderabad',
          state: 'Telangana',
          landmark: 'Near Cyber Towers',
          mapLabel: 'Startup-friendly location close to metro and cafes',
          parkingInfo: 'Shared basement parking for 25 cars',
        },
        amenities: ['Whiteboard', 'WiFi', 'Coffee Station', 'Projector', 'Video Conferencing', 'Portable Podium'],
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
        imageGallery: [
          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
        ],
        hallType: 'Seminar',
        availabilityStatus: true
      },
      {
        ownerId: users[1]._id,
        name: 'Skyline Rooftop Banquet',
        description: 'An open-air rooftop venue with skyline views, mood lighting, and versatile layouts for receptions, private parties, and premium dinner events.',
        capacity: 180,
        pricePerHour: 220,
        location: 'Riverfront Towers, Kochi',
        placeDetails: {
          addressLine: '22 Harbour View Road',
          area: 'Marine Drive',
          city: 'Kochi',
          state: 'Kerala',
          landmark: 'Above Riverfront Towers',
          mapLabel: 'Waterfront venue with evening event appeal',
          parkingInfo: 'Tower parking plus dedicated valet service',
        },
        amenities: ['Open Terrace', 'Ambient Lighting', 'DJ Console', 'Dining Zone', 'Lift Access', 'Rain Cover Setup'],
        image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80',
        imageGallery: [
          'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80',
        ],
        hallType: 'Banquet',
        availabilityStatus: true
      },
      {
        ownerId: users[2]._id,
        name: 'Arena Sports Pavilion',
        description: 'A multi-use indoor sports pavilion that also works for exhibitions, fitness events, college fests, and tournament-style gatherings.',
        capacity: 400,
        pricePerHour: 190,
        location: 'Stadium Circle, Pune',
        placeDetails: {
          addressLine: '9 Champions Avenue',
          area: 'Balewadi',
          city: 'Pune',
          state: 'Maharashtra',
          landmark: 'Near Balewadi High Street',
          mapLabel: 'Large-access venue in the sports district',
          parkingInfo: 'Large ground parking with vendor unloading zone',
        },
        amenities: ['Indoor Court', 'Exhibition Floor', 'High Ceiling', 'LED Floodlights', 'Changing Rooms', 'PA System'],
        image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
        imageGallery: [
          'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
        ],
        hallType: 'Sports',
        availabilityStatus: true
      }
    ]);

    console.log('Halls created');

    // Create bookings
    const bookings = await Booking.create([
      {
        userId: users[3]._id, // Alice Johnson
        hallId: halls[0]._id, // Grand Conference Hall
        bookingDate: new Date('2026-05-15'),
        startTime: '09:00',
        endTime: '17:00',
        totalHours: 8,
        totalPrice: 1200,
        purpose: 'Annual Company Meeting',
        status: 'Approved'
      },
      {
        userId: users[4]._id, // Bob Smith
        hallId: halls[1]._id, // Elegant Banquet Hall
        bookingDate: new Date('2026-06-20'),
        startTime: '18:00',
        endTime: '23:00',
        totalHours: 5,
        totalPrice: 1000,
        purpose: 'Wedding Reception',
        status: 'Approved'
      },
      {
        userId: users[3]._id, // Alice Johnson
        hallId: halls[2]._id, // Modern Auditorium
        bookingDate: new Date('2026-07-10'),
        startTime: '14:00',
        endTime: '18:00',
        totalHours: 4,
        totalPrice: 1000,
        purpose: 'Product Launch Event',
        status: 'Pending'
      }
    ]);

    console.log('Bookings created');

    // Create payments
    await Payment.create([
      {
        bookingId: bookings[0]._id,
        userId: users[3]._id,
        amount: 1200,
        paymentMethod: 'Online Slip',
        paymentStatus: 'Completed',
        gateway: 'Slip Upload',
        gatewayStatus: 'completed',
        transactionId: 'TXN_001',
        paymentReference: 'REF-ONLINE-001',
        slipImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
        paymentDate: new Date('2026-05-01')
      },
      {
        bookingId: bookings[1]._id,
        userId: users[4]._id,
        amount: 1000,
        paymentMethod: 'Online Slip',
        paymentStatus: 'Completed',
        gateway: 'Slip Upload',
        gatewayStatus: 'completed',
        transactionId: 'TXN_002',
        paymentReference: 'REF-ONLINE-002',
        slipImage: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80',
        paymentDate: new Date('2026-06-01')
      },
      {
        bookingId: bookings[2]._id,
        userId: users[3]._id,
        amount: 1000,
        paymentMethod: 'Cash',
        paymentStatus: 'Pending',
        paymentDate: new Date('2026-07-01')
      }
    ]);

    console.log('Payments created');

    // Create reviews
    await Review.create([
      {
        userId: users[3]._id,
        hallId: halls[0]._id,
        bookingId: bookings[0]._id,
        rating: 5,
        comment: 'Excellent facility! The sound system was top-notch and the staff was very helpful.',
        createdAt: new Date('2026-05-16')
      },
      {
        userId: users[4]._id,
        hallId: halls[1]._id,
        bookingId: bookings[1]._id,
        rating: 4,
        comment: 'Beautiful venue for our wedding. The catering kitchen was very convenient.',
        createdAt: new Date('2026-06-21')
      }
    ]);

    console.log('Reviews created');

    // Create visitors
    await Visitor.create([
      {
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        phone: '+1234567895',
        purpose: 'Business Meeting',
        hostUserId: users[3]._id,
        bookingId: bookings[0]._id,
        hallId: halls[0]._id,
        visitDate: new Date('2026-05-15'),
        checkInTime: '08:30',
        checkOutTime: '17:30',
        status: 'Checked-Out'
      },
      {
        name: 'Diana Prince',
        email: 'diana@example.com',
        phone: '+1234567896',
        purpose: 'Event Planning',
        hostUserId: users[4]._id,
        bookingId: bookings[1]._id,
        hallId: halls[1]._id,
        visitDate: new Date('2026-06-20'),
        checkInTime: '16:00',
        status: 'Checked-In'
      }
    ]);

    console.log('Visitors created');

    console.log('Database seeded successfully!');
    console.log('Demo login credentials:');
    demoUsers.forEach(({ role, email, password }) => {
      console.log(`- ${role}: ${email} / ${password}`);
    });
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
