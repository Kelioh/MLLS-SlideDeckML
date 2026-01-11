import express from "express";
import http from "http";
import { Server } from "socket.io";
import os from "os";

const app = express();
const server = http.createServer(app);

const io = new Server(server, { 
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
    } 
});

const activeQuizzes = {}; 

app.get("/vote", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vote</title>
        <script src="/socket.io/socket.io.js"></script>
        <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            button { display: block; width: 100%; padding: 20px; margin: 10px 0; font-size: 1.2rem; border-radius: 10px; background: #007bff; color: white; border: none; cursor: pointer; }
            button:disabled { background: #ccc; }
            #conn-log { font-size: 0.8rem; color: gray; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        </style>
    </head>
    <body>
        <div id="conn-log">Status: Initializing...</div>
        <h2 id="question">Waiting for quiz to start...</h2>
        <div id="options"></div>
        <p id="status"></p>

        <script>
            const socket = io();
            const sessionId = "SESSION123";
            const log = document.getElementById('conn-log');

            socket.on("connect", () => {
                console.log("Connected to server");
                log.innerText = "Status: Connected. Joining " + sessionId;
                socket.emit("join-session", sessionId);
            });

            socket.on("connect_error", (err) => {
                log.innerText = "Status: Connection Error: " + err.message;
            });

            socket.on("new-quiz-data", (data) => {
                console.log("New quiz data received:", data);
                log.innerText = "Status: Quiz Received";
                document.getElementById('question').innerText = data.question;
                
                const container = document.getElementById('options');
                container.innerHTML = ""; 
                
                data.options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.innerText = opt;
                    btn.onclick = () => {
                        socket.emit("vote", { sessionId, choice: opt });
                        document.getElementById('status').innerText = "Voted for: " + opt;
                        document.querySelectorAll('button').forEach(b => b.disabled = true);
                    };
                    container.appendChild(btn);
                });
            });
        </script>
    </body>
    </html>
  `);
});

io.on("connection", (socket) => {
  console.log("Client connected: " + socket.id);

  socket.on("join-session", (sessionId) => {
    socket.join(sessionId);
    console.log("Socket " + socket.id + " joined room: " + sessionId);

    const networks = os.networkInterfaces();
    let localIp = "localhost";

    Object.keys(networks).forEach((name) => {
        if (name.includes('docker') || name.includes('br-') || name.includes('veth')) {
            return;
        }

        networks[name].forEach((net) => {
            if (net.family === "IPv4" && !net.internal) {
                localIp = net.address;
            }
        });
    });

    socket.emit("mobile-ip", "http://" + localIp + ":3000/vote");
    
    if (activeQuizzes[sessionId]) {
        console.log("Syncing active quiz to: " + socket.id);
        socket.emit("new-quiz-data", activeQuizzes[sessionId]);
    }
  });

  socket.on("register-quiz", (data) => {
    console.log("Registering quiz for session: " + data.sessionId);
    activeQuizzes[data.sessionId] = data;
    io.to(data.sessionId).emit("new-quiz-data", data);
  });

  socket.on("vote", (data) => {
    console.log("Vote received: " + data.choice);
    io.to(data.sessionId).emit("qcm-results-update", data);
  });

});

server.listen(3000, "0.0.0.0", () => {
    const networks = os.networkInterfaces();
    let localIp = "localhost";

    Object.keys(networks).forEach((name) => {
        if (name.includes('docker') || name.includes('br-') || name.includes('veth')) {
            return;
        }

        networks[name].forEach((net) => {
            if (net.family === "IPv4" && !net.internal) {
                localIp = net.address;
            }
        });
    });

    console.log("Server is running");
    console.log("PowerPoint: http://localhost:3000");
    console.log("Mobile ip: http://" + localIp + ":3000/vote");
});