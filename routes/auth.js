const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// JWT Secret por defecto si no está en variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || 'energy-secret-key-2024';

// Registro
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, username, email } = req.body;
    
    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'Nombre, teléfono y contraseña son requeridos' });
    }
    
    // Verificar si el teléfono ya existe
    const existingUser = global.users.find(u => u.phone === phone);
    if (existingUser) {
      return res.status(400).json({ message: 'El teléfono ya está registrado' });
    }
    
    // Verificar si el username ya existe (si se proporcionó)
    if (username) {
      const existingUsername = global.users.find(u => u.username === username);
      if (existingUsername) {
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
      }
    }
    
    // Verificar si el email ya existe (si se proporcionó)
    if (email) {
      const existingEmail = global.users.find(u => u.email === email);
      if (existingEmail) {
        return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
      }
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear usuario
    const user = {
      id: Date.now().toString(),
      name,
      phone,
      password: hashedPassword,
      username: username || null,
      email: email || null,
      avatar: null,
      catalog: [],
      createdAt: new Date().toISOString()
    };
    
    global.users.push(user);
    global.saveUsers();
    
    res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente',
      user: { 
        id: user.id, 
        name: user.name, 
        phone: user.phone,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ message: 'Teléfono y contraseña son requeridos' });
    }
    
    // Buscar usuario
    const user = global.users.find(u => u.phone === phone);
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }
    
    // Crear token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    
    res.json({
      message: 'Login exitoso',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        phone: user.phone,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  try {
    // En una implementación real, aquí invalidarías el token en una blacklist
    // Por ahora solo enviamos confirmación
    res.json({
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;