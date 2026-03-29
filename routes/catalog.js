const express = require('express');
const router = express.Router();

// Obtener catálogo de un usuario
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = global.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({ catalog: user.catalog });
  } catch (error) {
    console.error('❌ Error obteniendo catálogo:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Agregar producto al catálogo
router.post('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { name, description, price, image, category } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ message: 'Nombre y precio son requeridos' });
    }
    
    const user = global.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const product = {
      id: Date.now().toString(),
      name,
      description: description || '',
      price: parseFloat(price),
      category: category || 'Otros',
      image: image || null,
      createdAt: new Date().toISOString()
    };
    
    user.catalog.push(product);
    global.saveUsers(); // Guardar automáticamente
    
    console.log('✅ Producto agregado:', product.name, '- Categoría:', product.category);
    
    res.status(201).json({ 
      message: 'Producto agregado exitosamente',
      product 
    });
  } catch (error) {
    console.error('❌ Error agregando producto:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Eliminar producto del catálogo
router.delete('/:userId/:productId', (req, res) => {
  try {
    const { userId, productId } = req.params;
    
    const user = global.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const productIndex = user.catalog.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    user.catalog.splice(productIndex, 1);
    global.saveUsers(); // Guardar automáticamente
    
    console.log('✅ Producto eliminado:', productId);
    
    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando producto:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Obtener categorías de un usuario
router.get('/:userId/categories', (req, res) => {
  try {
    const { userId } = req.params;
    const user = global.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Inicializar categorías si no existen
    if (!user.categories) {
      user.categories = [];
    }
    
    res.json({ categories: user.categories });
  } catch (error) {
    console.error('❌ Error obteniendo categorías:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Agregar categoría
router.post('/:userId/categories', (req, res) => {
  try {
    const { userId } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'El nombre de la categoría es requerido' });
    }
    
    const user = global.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Inicializar categorías si no existen
    if (!user.categories) {
      user.categories = [];
    }
    
    // Verificar si ya existe
    if (user.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ message: 'Esta categoría ya existe' });
    }
    
    const category = {
      id: Date.now().toString(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    
    user.categories.push(category);
    global.saveUsers();
    
    console.log('✅ Categoría agregada:', category.name);
    
    res.status(201).json({ 
      message: 'Categoría agregada exitosamente',
      category 
    });
  } catch (error) {
    console.error('❌ Error agregando categoría:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Eliminar categoría
router.delete('/:userId/categories/:categoryId', (req, res) => {
  try {
    const { userId, categoryId } = req.params;
    
    const user = global.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    if (!user.categories) {
      user.categories = [];
    }
    
    const categoryIndex = user.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    
    user.categories.splice(categoryIndex, 1);
    global.saveUsers();
    
    console.log('✅ Categoría eliminada:', categoryId);
    
    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando categoría:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Obtener zonas de domicilio de un usuario
router.get('/:userId/delivery-zones', (req, res) => {
  try {
    const { userId } = req.params;
    const user = global.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Inicializar zonas de domicilio si no existen
    if (!user.deliveryZones) {
      user.deliveryZones = [];
    }
    
    res.json({ zones: user.deliveryZones });
  } catch (error) {
    console.error('❌ Error obteniendo zonas de domicilio:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Agregar zona de domicilio
router.post('/:userId/delivery-zones', (req, res) => {
  try {
    const { userId } = req.params;
    const { name, cost, currency } = req.body;
    
    if (!name || cost === undefined || !currency) {
      return res.status(400).json({ message: 'Nombre, costo y moneda son requeridos' });
    }
    
    const user = global.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Inicializar zonas de domicilio si no existen
    if (!user.deliveryZones) {
      user.deliveryZones = [];
    }
    
    // Validar moneda
    const validCurrencies = ['USD', 'EURO', 'CUP', 'ZELLE'];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({ message: 'Moneda no válida' });
    }
    
    const zone = {
      id: Date.now().toString(),
      name: name.trim(),
      cost: parseFloat(cost),
      currency: currency,
      createdAt: new Date().toISOString()
    };
    
    user.deliveryZones.push(zone);
    global.saveUsers();
    
    console.log('✅ Zona de domicilio agregada:', zone.name, '-', zone.cost, zone.currency);
    
    res.status(201).json({ 
      message: 'Zona de domicilio agregada exitosamente',
      zone 
    });
  } catch (error) {
    console.error('❌ Error agregando zona de domicilio:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Eliminar zona de domicilio
router.delete('/:userId/delivery-zones/:zoneId', (req, res) => {
  try {
    const { userId, zoneId } = req.params;
    
    const user = global.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    if (!user.deliveryZones) {
      user.deliveryZones = [];
    }
    
    const zoneIndex = user.deliveryZones.findIndex(z => z.id === zoneId);
    if (zoneIndex === -1) {
      return res.status(404).json({ message: 'Zona de domicilio no encontrada' });
    }
    
    user.deliveryZones.splice(zoneIndex, 1);
    global.saveUsers();
    
    console.log('✅ Zona de domicilio eliminada:', zoneId);
    
    res.json({ message: 'Zona de domicilio eliminada exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando zona de domicilio:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Obtener configuración de moneda
router.get('/:userId/currency-config', (req, res) => {
  try {
    const { userId } = req.params;
    const user = global.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Inicializar configuración de moneda si no existe (por defecto CUP)
    if (!user.currencyConfig) {
      user.currencyConfig = { currency: 'CUP' };
    }
    
    res.json(user.currencyConfig);
  } catch (error) {
    console.error('❌ Error obteniendo configuración de moneda:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Establecer configuración de moneda
router.post('/:userId/currency-config', (req, res) => {
  try {
    const { userId } = req.params;
    const { currency } = req.body;
    
    if (!currency) {
      return res.status(400).json({ message: 'La moneda es requerida' });
    }
    
    const user = global.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Validar moneda
    const validCurrencies = ['USD', 'EURO', 'CUP', 'ZELLE'];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({ message: 'Moneda no válida' });
    }
    
    user.currencyConfig = { currency };
    global.saveUsers();
    
    console.log('✅ Configuración de moneda actualizada:', userId, '-', currency);
    
    res.json({ 
      message: 'Configuración de moneda actualizada exitosamente',
      currency 
    });
  } catch (error) {
    console.error('❌ Error actualizando configuración de moneda:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;