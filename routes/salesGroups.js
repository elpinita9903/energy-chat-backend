const express = require('express');
const router = express.Router();

// Crear grupo de venta
router.post('/create', async (req, res) => {
  try {
    const { name, description, currency, businessType, creatorId } = req.body;

    if (!name || !currency || !businessType || !creatorId) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Verificar si el usuario ya tiene un grupo con el mismo nombre
    const existingGroup = global.chats.find(chat => 
      chat.type === 'salesGroup' && 
      chat.participants && 
      chat.participants[0] === creatorId &&
      chat.name && 
      chat.name.toLowerCase().trim() === name.toLowerCase().trim()
    );

    if (existingGroup) {
      return res.status(409).json({ error: 'Ya tienes un grupo con ese nombre' });
    }

    const groupId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    const chatId = `group_${groupId}`;

    // Crear chat grupal asociado usando el sistema global
    const newGroupChat = {
      id: chatId,
      type: 'salesGroup',
      name: name.trim(),
      description: (description || '').trim(),
      participants: [creatorId],
      admins: [creatorId],
      createdAt: new Date().toISOString(),
      lastMessage: null,
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      isPinned: true, // Los grupos de venta siempre están fijados
      salesGroupId: groupId,
      businessType: businessType,
      currency: currency,
    };

    // Agregar al array global de chats
    global.chats.push(newGroupChat);
    
    // Guardar con manejo de errores
    try {
      global.saveChats();
    } catch (saveError) {
      console.error('❌ Error guardando chat:', saveError);
      // Remover el chat si no se pudo guardar
      global.chats = global.chats.filter(c => c.id !== chatId);
      return res.status(500).json({ error: 'Error guardando el grupo' });
    }

    console.log('✅ Grupo de venta creado:', groupId, 'Chat ID:', chatId);

    const groupResponse = {
      id: groupId,
      name: name.trim(),
      description: (description || '').trim(),
      currency,
      businessType,
      creatorId,
      members: [creatorId],
      admins: [creatorId],
      createdAt: new Date().toISOString(),
      isActive: true,
      chatId: chatId,
    };

    res.status(201).json({ 
      success: true, 
      group: groupResponse,
      chat: newGroupChat 
    });
  } catch (error) {
    console.error('❌ Error creando grupo de venta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener grupos de venta del usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Buscar chats de tipo salesGroup donde el usuario participa
    const userGroups = global.chats
      .filter(chat => 
        chat.type === 'salesGroup' && 
        chat.participants.includes(userId)
      )
      .map(chat => ({
        id: chat.salesGroupId,
        name: chat.name,
        description: chat.description,
        currency: chat.currency,
        businessType: chat.businessType,
        creatorId: chat.participants[0], // El primer participante es el creador
        members: chat.participants,
        admins: chat.admins,
        createdAt: chat.createdAt,
        isActive: true,
        chatId: chat.id,
      }));

    res.json({ groups: userGroups });
  } catch (error) {
    console.error('❌ Error obteniendo grupos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener grupos públicos de un usuario (para que otros los vean)
router.get('/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Buscar chats de tipo salesGroup creados por el usuario
    const publicGroups = global.chats
      .filter(chat => 
        chat.type === 'salesGroup' && 
        chat.participants[0] === userId // El primer participante es el creador
      )
      .map(chat => ({
        id: chat.salesGroupId,
        name: chat.name,
        description: chat.description,
        businessType: chat.businessType,
        currency: chat.currency,
        memberCount: chat.participants.length,
        createdAt: chat.createdAt,
        creatorId: chat.participants[0]
      }));

    res.json({ groups: publicGroups });
  } catch (error) {
    console.error('❌ Error obteniendo grupos públicos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Unirse a grupo de venta
router.post('/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // Buscar el chat del grupo
    const chatIndex = global.chats.findIndex(chat => 
      chat.type === 'salesGroup' && chat.salesGroupId === groupId
    );

    if (chatIndex === -1) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const chat = global.chats[chatIndex];
    
    if (!chat.participants.includes(userId)) {
      chat.participants.push(userId);
      global.saveChats();
      console.log('✅ Usuario', userId, 'se unió al grupo', groupId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error uniéndose al grupo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Salir del grupo de venta
router.post('/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // Buscar el chat del grupo
    const chatIndex = global.chats.findIndex(chat => 
      chat.type === 'salesGroup' && chat.salesGroupId === groupId
    );

    if (chatIndex === -1) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const chat = global.chats[chatIndex];
    
    // Remover de participantes
    chat.participants = chat.participants.filter(id => id !== userId);
    chat.admins = chat.admins.filter(id => id !== userId);

    // Si no quedan participantes, eliminar el chat
    if (chat.participants.length === 0) {
      global.chats.splice(chatIndex, 1);
    }

    global.saveChats();
    console.log('✅ Usuario', userId, 'salió del grupo', groupId);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error saliendo del grupo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener detalles del grupo
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Buscar el chat del grupo
    const chat = global.chats.find(chat => 
      chat.type === 'salesGroup' && chat.salesGroupId === groupId
    );

    if (!chat) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const group = {
      id: chat.salesGroupId,
      name: chat.name,
      description: chat.description,
      currency: chat.currency,
      businessType: chat.businessType,
      creatorId: chat.participants[0],
      members: chat.participants,
      admins: chat.admins,
      createdAt: chat.createdAt,
      isActive: true,
      chatId: chat.id,
    };

    res.json({ group });
  } catch (error) {
    console.error('❌ Error obteniendo grupo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;