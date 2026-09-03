import mongoose from "mongoose";
import dns from "dns";

// FIX: Set proper DNS servers (Node.js was only using localhost DNS)
// Use Google DNS as fallback to ensure MongoDB Atlas DNS resolves
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    const mongoOptions = {
      retryWrites: true,
      w: "majority",
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 30000, // Increased from 10000
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // Increased from 10000
      heartbeatFrequencyMS: 10000,
    };

    console.log("🔗 Attempting to connect to MongoDB Atlas...");

    // Add connection listeners before connecting
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  Mongoose disconnected from MongoDB");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ Mongoose reconnected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("🔥 Mongoose connection error:", err.message);
    });

    await mongoose.connect(mongoUri, mongoOptions);

    console.log("✅ Successfully connected to MongoDB Atlas");
    console.log("   Database:", mongoose.connection.name);

    return;
  } catch (atlasErr) {
    const allowLocalFallback =
      String(process.env.ALLOW_LOCAL_DB_FALLBACK || "false").toLowerCase() ===
      "true";

    if (!allowLocalFallback) {
      console.error(
        "❌ Atlas connection failed and local fallback is disabled (ALLOW_LOCAL_DB_FALLBACK=false).",
      );
      throw atlasErr;
    }

    console.warn(
      "⚠️  MongoDB Atlas unavailable:",
      atlasErr.code || atlasErr.message,
    );

    // Fallback to local MongoDB for development
    try {
      console.log("🔗 Falling back to Local MongoDB...");
      const mongoOptions = {
        retryWrites: true,
        maxPoolSize: 5,
        connectTimeoutMS: 10000,
      };

      await mongoose.connect(
        "mongodb://localhost:27017/BM12-Section",
        mongoOptions,
      );
      console.log("✅ Connected to Local MongoDB (Development Mode)");
      console.log(
        "   ⚠️  WARNING: Using local database - changes will NOT sync to Atlas",
      );
    } catch (localErr) {
      console.error("❌ Both MongoDB Atlas and Local MongoDB failed");
      console.error("   Atlas error:", atlasErr.message);
      console.error("   Local error:", localErr.message);
      throw atlasErr; // Throw Atlas error as original
    }
  }
}

export default connectDB;
