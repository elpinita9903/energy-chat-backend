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
    const { name, description, price, image } = req.body;
    
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
      image: image || null,
      createdAt: new Date().toISOString()
    };
    
    user.catalog.push(product);
    global.saveUsers(); // Guardar automáticamente
    
    console.log('✅ Producto agregado:', product.name);
    
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

module.exports = router;