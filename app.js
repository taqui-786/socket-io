import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Environment variables
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("This is socket.io page");
});

const userSocketMap = new Map();

io.on("connection", (socket) => {
  const username = socket.handshake.auth.username;
  const userId = socket.handshake.auth.userId;

  if (userId) {
    userSocketMap.set(userId, socket.id);
  }

  socket.on("set-user-active", (_payload, callback) => {
    console.log(`User ${userId} is active`);
    const usersArray = Array.from(userSocketMap.entries());
    socket.broadcast.emit("users-active", usersArray);
    callback(usersArray);
  });

  socket.on("post-liked", ({ postUsername, postId }) => {
    console.log(`Post liked by ${username}`);
    const targetSocketId = userSocketMap.get(postUsername);

    if (targetSocketId) {
      io.to(targetSocketId).emit("your-post-liked", {
        from: username,
        postId,
      });
    }
  });

  socket.on("new-message-sent", ({ message, friendId }) => {
    console.log(`Message sent to ${friendId}`);
    const targetSocketId = userSocketMap.get(friendId);

    if (targetSocketId) {
      io.to(targetSocketId).emit("new-message-received", message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected`);
    userSocketMap.delete(userId);
    io.emit("users-active", Array.from(userSocketMap.entries()));
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
