const express = require('express');
const router = express.Router();

// Obtener chats de un usuario (individuales y grupales)
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Buscar chats donde el usuario participa
    const userChats = global.chats.filter(chat => 
      chat.participants.includes(userId)
    );
    
    // Agregar información de los participantes, último mensaje y mensajes no leídos
    const chatsWithDetails = userChats.map(chat => {
      // Obtener último mensaje
      const chatMessages = global.messages
        .filter(m => m.chatId === chat.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Contar mensajes no leídos (mensajes que no son del usuario y no están leídos)
      const unreadCount = global.messages.filter(m => 
        m.chatId === chat.id && 
        m.senderId !== userId && 
        m.read === false
      ).length;
      
      // Si es un grupo de venta
      if (chat.type === 'salesGroup') {
        return {
          id: chat.id,
          type: 'salesGroup',
          name: chat.name,
          description: chat.description,
          businessType: chat.businessType,
          currency: chat.currency,
          participants: chat.participants,
          admins: chat.admins,
          salesGroupId: chat.salesGroupId,
          lastMessage: chatMessages[0] || null,
          unreadCount: unreadCount,
          isPinned: chat.isPinned || false,
          createdAt: chat.createdAt
        };
      }
      
      // Si es un chat individual (o no tiene tipo definido - compatibilidad)
      const otherParticipant = chat.participants.find(p => p !== userId);
      const otherUser = global.users.find(u => u.id === otherParticipant);
      
      return {
        id: chat.id,
        type: chat.type || 'individual', // Asegurar que siempre tenga tipo
        otherUser: otherUser ? {
          id: otherUser.id,
          name: otherUser.name,
          phone: otherUser.phone,
          avatar: otherUser.avatar
        } : null,
        lastMessage: chatMessages[0] || null,
        unreadCount: unreadCount,
        createdAt: chat.createdAt
      };
    });
    
    res.json({ chats: chatsWithDetails });
  } catch (error) {
    console.error('❌ Error obteniendo chats:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Crear o obtener chat entre dos usuarios
router.post('/create', (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    
    if (!userId1 || !userId2) {
      return res.status(400).json({ message: 'Se requieren ambos usuarios' });
    }
    
    // Verificar si ya existe un chat entre estos usuarios
    const existingChat = global.chats.find(chat => 
      chat.participants.includes(userId1) && chat.participants.includes(userId2)
    );
    
    if (existingChat) {
      return res.json({ chat: existingChat });
    }
    
    // Crear nuevo chat
    const newChat = {
      id: Date.now().toString(),
      type: 'individual', // Agregar tipo para chats individuales
      participants: [userId1, userId2],
      createdAt: new Date().toISOString()
    };
    
    global.chats.push(newChat);
    global.saveChats(); // Guardar automáticamente
    
    console.log('✅ Chat creado:', newChat.id);
    
    res.status(201).json({ chat: newChat });
  } catch (error) {
    console.error('❌ Error creando chat:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Obtener mensajes de un chat
router.get('/:chatId/messages', (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chatMessages = global.messages
      .filter(m => m.chatId === chatId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({ messages: chatMessages });
  } catch (error) {
    console.error('❌ Error obteniendo mensajes:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Eliminar chat
router.delete('/:chatId', (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Buscar el chat
    const chatIndex = global.chats.findIndex(c => c.id === chatId);
    
    if (chatIndex === -1) {
      return res.status(404).json({ message: 'Chat no encontrado' });
    }
    
    // Eliminar el chat
    global.chats.splice(chatIndex, 1);
    global.saveChats();
    
    // Eliminar todos los mensajes del chat
    global.messages = global.messages.filter(m => m.chatId !== chatId);
    global.saveMessages();
    
    console.log('✅ Chat eliminado:', chatId);
    
    res.json({ message: 'Chat eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando chat:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Eliminar mensaje
router.delete('/:chatId/messages/:messageId', (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    
    // Buscar el mensaje
    const messageIndex = global.messages.findIndex(m => m.id === messageId && m.chatId === chatId);
    
    if (messageIndex === -1) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }
    
    // Eliminar el mensaje
    global.messages.splice(messageIndex, 1);
    global.saveMessages();
    
    console.log('✅ Mensaje eliminado:', messageId);
    
    res.json({ message: 'Mensaje eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando mensaje:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;