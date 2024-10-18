import { Server } from "socket.io";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createServer } from 'http';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);  // Create HTTP server using Express app
const io = new Server(server);     // Attach Socket.IO to the server
const __dirname = dirname(fileURLToPath(import.meta.url));

// open the database file
const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database
});

// create our 'messages' table (you can ignore the 'client_offset' column for now)
await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_offset TEXT UNIQUE,
    content TEXT
  );
`);

io.on('connection', (socket) => {
    socket.on('chat message', async (msg) => {
      let result;
      try {
        // store the message in the database
        result = await db.run('INSERT INTO messages (content) VALUES (?)', msg);
      } catch (e) {
        // TODO handle the failure
        return;
      }
      // include the offset with the message
      io.emit('chat message', msg, result.lastID);
      if (!socket.recovered) {
        // if the connection state recovery was not successful
        try {
          await db.each('SELECT id, content FROM messages WHERE id > ?',
            [socket.handshake.auth.serverOffset || 0],
            (_err, row) => {
              socket.emit('chat message', row.content, row.id);
            }
          )
        } catch (e) {
          // something went wrong
        }
      }
    });
  });
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
server.listen(port, () => {
    console.log('server listening on port', port);
});
