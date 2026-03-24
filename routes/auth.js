const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// JWT Secret por defecto si no está en variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || 'energy-secret-key-2024';

// Registro
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    
    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    // Verificar si el usuario ya existe
    const existingUser = global.users.find(u => u.phone === phone);
    if (existingUser) {
      return res.status(400).json({ message: 'El teléfono ya está registrado' });
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear usuario
    const user = {
      id: Date.now().toString(),
      name,
      phone,
      password: hashedPassword,
      avatar: null,
      catalog: [],
      createdAt: new Date().toISOString()
    };
    
    global.users.push(user);
    global.saveUsers(); // Guardar automáticamente
    
    // Crear token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    
    console.log('✅ Usuario registrado:', user.name);
    
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ Error en registro:', error);
    res.status(500).json({ message: 'Error del servidor' });
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
    
    console.log('✅ Usuario logueado:', user.name);
    
    res.json({
      message: 'Login exitoso',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  try {
    // En una implementación real, aquí invalidarías el token en una blacklist
    // Por ahora solo enviamos confirmación
    console.log('✅ Usuario cerró sesión');
    
    res.json({
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;