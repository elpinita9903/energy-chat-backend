const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const CARTS_FILE = path.join(__dirname, '../data/carts.json');

// Función para leer carritos
async function readCarts() {
  try {
    const data = await fs.readFile(CARTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Función para escribir carritos
async function writeCarts(carts) {
  await fs.writeFile(CARTS_FILE, JSON.stringify(carts, null, 2));
}

// Función para obtener o crear carrito de usuario
async function getUserCart(userId) {
  const carts = await readCarts();
  let cart = carts.find(c => c.userId === userId);
  
  if (!cart) {
    cart = {
      userId,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    carts.push(cart);
    await writeCarts(carts);
  }
  
  return cart;
}

// GET /api/cart/:userId - Obtener carrito del usuario
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await getUserCart(userId);
    res.json(cart);
  } catch (error) {
    console.error('Error al obtener carrito:', error);
    res.status(500).json({ error: 'Error al obtener el carrito' });
  }
});

// POST /api/cart/:userId/items - Agregar producto al carrito
router.post('/:userId/items', async (req, res) => {
  try {
    const { userId } = req.params;
    const item = req.body;

    // Validar datos
    if (!item.id || !item.name || item.price === undefined || !item.quantity) {
      return res.status(400).json({ error: 'Datos del producto incompletos' });
    }

    // Validar stock
    if (item.stock !== null && item.stock !== undefined && item.quantity > item.stock) {
      return res.status(400).json({ 
        error: 'Cantidad excede el stock disponible',
        availableStock: item.stock
      });
    }

    const carts = await readCarts();
    let cart = carts.find(c => c.userId === userId);
    
    if (!cart) {
      cart = {
        userId,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      carts.push(cart);
    }

    // Buscar si el producto ya existe
    const existingIndex = cart.items.findIndex(i => i.id === item.id);
    
    if (existingIndex !== -1) {
      // Actualizar cantidad
      const newQuantity = cart.items[existingIndex].quantity + item.quantity;
      
      // Validar stock con nueva cantidad
      if (item.stock !== null && item.stock !== undefined && newQuantity > item.stock) {
        return res.status(400).json({ 
          error: 'Cantidad total excede el stock disponible',
          availableStock: item.stock,
          currentQuantity: cart.items[existingIndex].quantity
        });
      }
      
      cart.items[existingIndex].quantity = newQuantity;
    } else {
      // Agregar nuevo producto
      cart.items.push({
        ...item,
        addedAt: new Date().toISOString()
      });
    }

    cart.updatedAt = new Date().toISOString();
    await writeCarts(carts);

    res.json(cart);
  } catch (error) {
    console.error('Error al agregar producto:', error);
    res.status(500).json({ error: 'Error al agregar producto' });
  }
});

// PUT /api/cart/:userId/items/:itemId - Actualizar cantidad
router.put('/:userId/items/:itemId', async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    const carts = await readCarts();
    const cart = carts.find(c => c.userId === userId);

    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    const itemIndex = cart.items.findIndex(i => i.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Si cantidad es 0, eliminar
    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      // Validar stock
      const item = cart.items[itemIndex];
      if (item.stock !== null && item.stock !== undefined && quantity > item.stock) {
        return res.status(400).json({ 
          error: 'Cantidad excede el stock disponible',
          availableStock: item.stock
        });
      }
      
      cart.items[itemIndex].quantity = quantity;
    }

    cart.updatedAt = new Date().toISOString();
    await writeCarts(carts);

    res.json(cart);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE /api/cart/:userId/items/:itemId - Eliminar producto
router.delete('/:userId/items/:itemId', async (req, res) => {
  try {
    const { userId, itemId } = req.params;

    const carts = await readCarts();
    const cart = carts.find(c => c.userId === userId);

    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    const itemIndex = cart.items.findIndex(i => i.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    cart.items.splice(itemIndex, 1);
    cart.updatedAt = new Date().toISOString();
    await writeCarts(carts);

    res.json(cart);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// DELETE /api/cart/:userId - Vaciar carrito completo
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const carts = await readCarts();
    const cart = carts.find(c => c.userId === userId);

    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    cart.items = [];
    cart.updatedAt = new Date().toISOString();
    await writeCarts(carts);

    res.json(cart);
  } catch (error) {
    console.error('Error al vaciar carrito:', error);
    res.status(500).json({ error: 'Error al vaciar carrito' });
  }
});

// DELETE /api/cart/:userId/vendor/:vendorId - Vaciar productos de un vendedor
router.delete('/:userId/vendor/:vendorId', async (req, res) => {
  try {
    const { userId, vendorId } = req.params;

    const carts = await readCarts();
    const cart = carts.find(c => c.userId === userId);

    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    cart.items = cart.items.filter(item => item.vendorId !== vendorId);
    cart.updatedAt = new Date().toISOString();
    await writeCarts(carts);

    res.json(cart);
  } catch (error) {
    console.error('Error al vaciar carrito del vendedor:', error);
    res.status(500).json({ error: 'Error al vaciar carrito del vendedor' });
  }
});

// GET /api/cart/:userId/summary - Resumen agrupado por vendedor
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await getUserCart(userId);

    // Agrupar por vendedor
    const grouped = {};
    cart.items.forEach(item => {
      const vendorId = item.vendorId || 'unknown';
      if (!grouped[vendorId]) {
        grouped[vendorId] = {
          vendorId,
          vendorName: item.vendorName || 'Vendedor Desconocido',
          items: [],
          total: 0,
          itemCount: 0
        };
      }
      grouped[vendorId].items.push(item);
      grouped[vendorId].total += item.price * item.quantity;
      grouped[vendorId].itemCount++;
    });

    const summary = {
      userId,
      vendors: Object.values(grouped),
      totalItems: cart.items.length,
      totalAmount: cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      vendorCount: Object.keys(grouped).length
    };

    res.json(summary);
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

// POST /api/cart/:userId/checkout - Completar pedido
router.post('/:userId/checkout', async (req, res) => {
  try {
    const { userId } = req.params;
    const { vendorId, deliveryInfo, paymentMethod } = req.body;

    const carts = await readCarts();
    const cart = carts.find(c => c.userId === userId);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Filtrar productos del vendedor si se especifica
    let orderItems = cart.items;
    if (vendorId) {
      orderItems = cart.items.filter(item => item.vendorId === vendorId);
      if (orderItems.length === 0) {
        return res.status(400).json({ error: 'No hay productos de este vendedor' });
      }
    }

    // Validar stock
    for (const item of orderItems) {
      if (item.stock !== null && item.stock !== undefined && item.quantity > item.stock) {
        return res.status(400).json({ 
          error: `Stock insuficiente para ${item.name}`,
          product: item.name,
          availableStock: item.stock,
          requestedQuantity: item.quantity
        });
      }
    }

    // Crear pedido
    const order = {
      orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      vendorId: vendorId || orderItems[0].vendorId,
      vendorName: orderItems[0].vendorName,
      items: orderItems,
      total: orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      deliveryInfo: deliveryInfo || null,
      paymentMethod: paymentMethod || null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Eliminar productos del carrito
    if (vendorId) {
      cart.items = cart.items.filter(item => item.vendorId !== vendorId);
    } else {
      cart.items = [];
    }
    
    cart.updatedAt = new Date().toISOString();
    await writeCarts(carts);

    res.json({
      success: true,
      order,
      cart
    });
  } catch (error) {
    console.error('Error al procesar checkout:', error);
    res.status(500).json({ error: 'Error al procesar el pedido' });
  }
});

module.exports = router;
