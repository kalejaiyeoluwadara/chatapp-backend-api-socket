const mongoose = require("mongoose");

// MongoDB connection configuration
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/chat_app",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferMaxEntries: 0, // Disable mongoose buffering
        bufferCommands: false, // Disable mongoose buffering
      }
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed through app termination");
        process.exit(0);
      } catch (err) {
        console.error("Error during MongoDB shutdown:", err);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Create indexes for better performance
const createIndexes = async () => {
  try {
    // User indexes
    await mongoose.model("User").createIndexes();

    // Message indexes
    await mongoose.model("Message").createIndexes();

    console.log("Database indexes created successfully");
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
};

// Initialize database with sample data (for development)
const initializeDatabase = async () => {
  if (process.env.NODE_ENV === "development") {
    try {
      const User = mongoose.model("User");

      // Check if admin user exists
      const adminExists = await User.findOne({ username: "admin" });
      if (!adminExists) {
        const adminUser = new User({
          username: "admin",
          email: "kalejaiyeoluwadara1@gmail.com",
          password: "admin123",
          firstName: "Kalejaiye",
          lastName: "Oluwadara",
          isEmailVerified: true,
          bio: "System Administrator",
        });

        await adminUser.save();
        console.log("Admin user created for development");
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }
};

// Health check for database
const checkDatabaseHealth = async () => {
  try {
    const status = mongoose.connection.readyState;
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    return {
      status: states[status] || "unknown",
      readyState: status,
      isConnected: status === 1,
    };
  } catch (error) {
    return {
      status: "error",
      error: error.message,
      isConnected: false,
    };
  }
};

module.exports = {
  connectDB,
  createIndexes,
  initializeDatabase,
  checkDatabaseHealth,
};
