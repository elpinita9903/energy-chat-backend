const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const SALES_GROUPS_FILE = path.join(__dirname, '../data/salesGroups.json');
const CHATS_FILE = path.join(__dirname, '../data/chats.json');
const MESSAGES_FILE = path.join(__dirname, '../data/messages.json');

// Función para leer grupos de venta
async function readSalesGroups() {
  try {
    const data = await fs.readFile(SALES_GROUPS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { groups: [] };
  }
}

// Función para escribir grupos de venta
async function writeSalesGroups(data) {
  await fs.writeFile(SALES_GROUPS_FILE, JSON.stringify(data, null, 2));
}

// Función para leer chats
async function readChats() {
  try {
    const data = await fs.readFile(CHATS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { chats: [] };
  }
}

// Función para escribir chats
async function writeChats(data) {
  await fs.writeFile(CHATS_FILE, JSON.stringify(data, null, 2));
}

// Crear grupo de venta
router.post('/create', async (req, res) => {
  try {
    const { name, description, currency, businessType, creatorId } = req.body;

    if (!name || !currency || !businessType || !creatorId) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const salesGroupsData = await readSalesGroups();
    const chatsData = await readChats();

    const groupId = Date.now().toString();
    const chatId = `group_${groupId}`;

    // Crear grupo de venta
    const newGroup = {
      id: groupId,
      name,
      description: description || '',
      currency,
      businessType,
      creatorId,
      members: [creatorId],
      admins: [creatorId],
      createdAt: new Date().toISOString(),
      isActive: true,
      chatId: chatId,
    };

    salesGroupsData.groups.push(newGroup);

    // Crear chat grupal asociado
    const newGroupChat = {
      id: chatId,
      type: 'salesGroup',
      name: name,
      description: description || '',
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

    chatsData.chats.push(newGroupChat);

    await writeSalesGroups(salesGroupsData);
    await writeChats(chatsData);

    res.json({ 
      success: true, 
      group: newGroup,
      chat: newGroupChat 
    });
  } catch (error) {
    console.error('Error creando grupo de venta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener grupos de venta del usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const salesGroupsData = await readSalesGroups();

    const userGroups = salesGroupsData.groups.filter(group => 
      group.members.includes(userId) && group.isActive
    );

    res.json({ groups: userGroups });
  } catch (error) {
    console.error('Error obteniendo grupos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener grupos públicos de un usuario (para que otros los vean)
router.get('/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const salesGroupsData = await readSalesGroups();

    // Solo mostrar grupos donde el usuario es creador y tiene más de 1 miembro
    // O grupos que están marcados como públicos
    const publicGroups = salesGroupsData.groups.filter(group => 
      group.creatorId === userId && 
      group.isActive && 
      (group.members.length > 1 || group.isPublic === true)
    );

    // Devolver información básica sin datos sensibles
    const publicGroupsInfo = publicGroups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      businessType: group.businessType,
      currency: group.currency,
      memberCount: group.members.length,
      createdAt: group.createdAt,
      creatorId: group.creatorId
    }));

    res.json({ groups: publicGroupsInfo });
  } catch (error) {
    console.error('Error obteniendo grupos públicos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Unirse a grupo de venta
router.post('/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const salesGroupsData = await readSalesGroups();
    const chatsData = await readChats();

    const groupIndex = salesGroupsData.groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const group = salesGroupsData.groups[groupIndex];
    
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      
      // Actualizar chat grupal
      const chatIndex = chatsData.chats.findIndex(c => c.id === group.chatId);
      if (chatIndex !== -1) {
        chatsData.chats[chatIndex].participants.push(userId);
      }

      await writeSalesGroups(salesGroupsData);
      await writeChats(chatsData);
    }

    res.json({ success: true, group });
  } catch (error) {
    console.error('Error uniéndose al grupo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Salir del grupo de venta
router.post('/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const salesGroupsData = await readSalesGroups();
    const chatsData = await readChats();

    const groupIndex = salesGroupsData.groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const group = salesGroupsData.groups[groupIndex];
    
    // Remover de miembros
    group.members = group.members.filter(id => id !== userId);
    group.admins = group.admins.filter(id => id !== userId);

    // Si no quedan miembros, desactivar grupo
    if (group.members.length === 0) {
      group.isActive = false;
    }

    // Actualizar chat grupal
    const chatIndex = chatsData.chats.findIndex(c => c.id === group.chatId);
    if (chatIndex !== -1) {
      chatsData.chats[chatIndex].participants = chatsData.chats[chatIndex].participants.filter(id => id !== userId);
    }

    await writeSalesGroups(salesGroupsData);
    await writeChats(chatsData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error saliendo del grupo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener detalles del grupo
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const salesGroupsData = await readSalesGroups();

    const group = salesGroupsData.groups.find(g => g.id === groupId);
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Error obteniendo grupo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;