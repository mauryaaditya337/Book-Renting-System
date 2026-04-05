require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../src/models/User");

async function makeAdmin() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  await mongoose.connect(mongoUri);

  try {
    const user = await User.findOneAndUpdate(
      { email: "random3@gmail.com" },
      { $set: { isAdmin: true } },
      { new: true }
    ).select("email isAdmin");

    if (!user) {
      console.log("User not found");
      process.exitCode = 1;
      return;
    }

    console.log(`User updated: ${user.email} isAdmin=${user.isAdmin}`);
  } finally {
    await mongoose.disconnect();
  }
}

makeAdmin().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
