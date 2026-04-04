const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const bookRoutes = require("./routes/bookRoutes");
const bookMetadataRoutes = require("./routes/bookMetadataRoutes");
const rentalRequestRoutes = require("./routes/rentalRequestRoutes");
const bookRequestRoutes = require("./routes/bookRequestRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Server is running" });
});

app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/book-metadata", bookMetadataRoutes);
app.use("/api/rent-requests", rentalRequestRoutes);
app.use("/api/book-requests", bookRequestRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chats", chatRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
