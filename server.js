const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true
});

// Middleware
app.use(cors());
app.use(express.json());

// Archivos de datos
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Crear directorio de datos si no existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Funciones para cargar y guardar datos
const loadData = (file, defaultValue = []) => {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error cargando ${file}:`, error);
  }
  return defaultValue;
};

const saveData = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error guardando ${file}:`, error);
  }
};

// Cargar datos al iniciar
global.users = loadData(USERS_FILE, []);
global.chats = loadData(CHATS_FILE, []);
global.messages = loadData(MESSAGES_FILE, []);

console.log(`📊 Datos cargados: ${global.users.length} usuarios, ${global.chats.length} chats, ${global.messages.length} mensajes`);

// Funciones para guardar automáticamente
global.saveUsers = () => saveData(USERS_FILE, global.users);
global.saveChats = () => saveData(CHATS_FILE, global.chats);
global.saveMessages = () => saveData(MESSAGES_FILE, global.messages);

// Rutas
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 WhatsApp Clone API funcionando!',
    endpoints: {
      auth: '/api/auth/register, /api/auth/login',
      users: '/api/users',
      chats: '/api/chats',
      catalog: '/api/catalog'
    }
  });
});

// Importar rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/catalog', require('./routes/catalog'));

// Socket.io para chat en tiempo real
const connectedUsers = new Map(); // Rastrear usuarios conectados

io.on('connection', (socket) => {
  console.log('✅ Usuario conectado:', socket.id);
  
  // Unirse a una sala de chat
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`👥 Usuario ${socket.id} se unió al chat ${chatId}`);
  });
  
  // Registrar usuario conectado
  socket.on('register_user', (userId) => {
    connectedUsers.set(socket.id, userId);
    console.log(`👤 Usuario ${userId} registrado con socket ${socket.id}`);
  });
  
  // Enviar mensaje con mejor manejo de errores
  socket.on('send_message', async (data) => {
    try {
      console.log('📨 Mensaje recibido para enviar:', data);
      
      // Validar datos
      if (!data.chatId || !data.senderId || !data.text) {
        console.error('❌ Datos de mensaje inválidos:', data);
        socket.emit('message_error', { error: 'Datos de mensaje inválidos' });
        return;
      }
      
      // Guardar mensaje en memoria
      const message = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        chatId: data.chatId,
        senderId: data.senderId,
        text: data.text.trim(),
        timestamp: new Date().toISOString(),
        read: false
      };
      
      global.messages.push(message);
      
      // Guardar con manejo de errores
      try {
        global.saveMessages();
      } catch (saveError) {
        console.error('❌ Error guardando mensaje:', saveError);
      }
      
      // Actualizar el último mensaje del chat
      const chatIndex = global.chats.findIndex(c => c.id === data.chatId);
      if (chatIndex !== -1) {
        global.chats[chatIndex].lastMessage = {
          text: message.text,
          timestamp: message.timestamp,
          senderId: message.senderId
        };
        global.chats[chatIndex].updatedAt = message.timestamp;
        
        try {
          global.saveChats();
        } catch (saveError) {
          console.error('❌ Error guardando chat:', saveError);
        }
      }
      
      console.log('📤 Enviando mensaje a sala:', data.chatId);
      
      // Enviar a todos en el chat con confirmación
      io.to(data.chatId).emit('receive_message', message);
      
      // Confirmar al emisor que el mensaje se envió
      socket.emit('message_sent', { messageId: message.id });
      
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      socket.emit('message_error', { error: 'Error procesando mensaje' });
    }
  });
  
  // Marcar mensajes como leídos con mejor rendimiento
  socket.on('mark_as_read', (data) => {
    try {
      const { chatId, userId } = data;
      console.log(`👁️ Marcando mensajes como leídos en chat ${chatId} para usuario ${userId}`);
      
      let messagesUpdated = 0;
      
      // Marcar mensajes como leídos de forma más eficiente
      global.messages.forEach(msg => {
        if (msg.chatId === chatId && msg.senderId !== userId && !msg.read) {
          msg.read = true;
          messagesUpdated++;
        }
      });
      
      if (messagesUpdated > 0) {
        try {
          global.saveMessages();
          // Notificar a todos en el chat que los mensajes fueron leídos
          io.to(chatId).emit('messages_read', { chatId, userId });
        } catch (saveError) {
          console.error('❌ Error guardando mensajes leídos:', saveError);
        }
      }
      
    } catch (error) {
      console.error('❌ Error marcando mensajes como leídos:', error);
    }
  });
  
  // Manejar eliminación de mensajes
  socket.on('message_deleted', (data) => {
    try {
      const { chatId, messageId } = data;
      console.log(`🗑️ Notificando eliminación de mensaje ${messageId} en chat ${chatId}`);
      
      // Notificar a todos en el chat excepto al emisor
      socket.to(chatId).emit('message_deleted', { chatId, messageId });
      
    } catch (error) {
      console.error('❌ Error notificando eliminación:', error);
    }
  });
  
  socket.on('disconnect', () => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      connectedUsers.delete(socket.id);
      console.log(`❌ Usuario ${userId} desconectado:`, socket.id);
    } else {
      console.log('❌ Usuario desconectado:', socket.id);
    }
  });
  
  // Manejar errores de socket
  socket.on('error', (error) => {
    console.error('❌ Error de socket:', error);
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📱 Para conectar desde tu teléfono usa: http://192.168.1.100:${PORT}`);
    console.log(`🌐 API disponible en: http://192.168.1.100:${PORT}/api`);
  } else {
    console.log(`🌐 Servidor en producción en puerto ${PORT}`);
  }
});