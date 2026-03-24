const express = require('express');
const router = express.Router();

// Obtener todos los usuarios (para buscar contactos)
router.get('/', (req, res) => {
  try {
    const users = global.users.map(user => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar
    }));
    
    res.json({ users });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Obtener perfil de usuario
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = global.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        catalog: user.catalog
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;