import { Server } from "socket.io";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createServer } from 'http';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);  // Create HTTP server using Express app
const io = new Server(server);     // Attach Socket.IO to the server
const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "practice",
  password: "wisdom6715!!@",
  port: 5432,
})
db.connect();

app.get('/', (req, res) => {
    res.send ('<h1>Hello world!</h1>');
});

app.get('/message', (req, res) => {
    res.sendFile(join(__dirname + '/index.html'));
});

io.on('connection', socket => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
io.on('connection', (socket)=>{
    socket.on('chat-message', (msg) => {
        console.log('message: ' + msg)
    })
})
io.on('connection', (socket) => {
  socket.on('chat-message', (msg) => {
    socket.broadcast.emit('chat-message', msg);
  });
});

io.on('connection', (socket) => {
  socket.on('chat-message', async (msg) => {
    let result;
    try {
      // store the message in the database
      result = await db.query('INSERT INTO messages (content) VALUES ($1)', [msg]);
      console.log('data stored in database');
      
    } catch (e) {
      // TODO handle the failure
      console.log('Error storing messages in database:', e);
      return;
    }
  });
});
io.on('connection', async(socket) => {
    if (!socket.recovered) {
      // If the connection recovery was not successful
      try {
        // Query to fetch messages with an ID greater than the client's last acknowledged message ID
        const result = await db.query(
          'SELECT content FROM messages ORDER BY message_Id DESC LIMIT 20',
        //   [socket.handshake.auth.serverOffset || 0]
        );
        
        // Loop through the result and send each message to the client
        result.rows.forEach(row => {
          socket.emit('chat-message', row.content, row.id);
        });

      } catch (e) {
        // Handle any error that occurs during the database query
        console.error('Error fetching messages from database:', e);
      }
    }
  });
server.listen(port, () => {
    console.log('server listening on port', port);
});
