# Energy Chat - Backend API

Backend de la aplicación Energy Chat construido con Node.js, Express y Socket.io.

## 🚀 Características

- ✅ API REST completa
- ✅ Chat en tiempo real con Socket.io
- ✅ Autenticación JWT
- ✅ Persistencia en archivos JSON
- ✅ CORS configurado
- ✅ Listo para Railway deployment

## 🛠️ Tecnologías

- Node.js + Express
- Socket.io para tiempo real
- JWT para autenticación
- bcryptjs para encriptación
- CORS para cross-origin
- dotenv para variables de entorno

## 📦 Instalación Local

```bash
# Instalar dependencias
yarn install

# Modo desarrollo
yarn dev

# Modo producción
yarn start
```

## 🌐 Despliegue en Railway

Este proyecto está configurado para desplegarse automáticamente en Railway.app:

1. Conecta este repositorio a Railway
2. Railway detectará automáticamente Node.js
3. Usará `yarn start` como comando de inicio
4. El servidor estará disponible en la URL proporcionada

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

### Usuarios
- `GET /api/users` - Obtener todos los usuarios
- `GET /api/users/:id` - Obtener usuario específico

### Chats
- `GET /api/chats/:userId` - Obtener chats del usuario
- `POST /api/chats/create` - Crear nuevo chat
- `GET /api/chats/:chatId/messages` - Obtener mensajes
- `DELETE /api/chats/:chatId` - Eliminar chat
- `DELETE /api/chats/:chatId/messages/:messageId` - Eliminar mensaje

### Catálogo
- `GET /api/catalog/:userId` - Obtener catálogo del usuario
- `POST /api/catalog/:userId` - Agregar producto
- `DELETE /api/catalog/:userId/:productId` - Eliminar producto

## 🔌 Socket.io Events

### Cliente → Servidor
- `join_chat` - Unirse a sala de chat
- `send_message` - Enviar mensaje
- `mark_as_read` - Marcar mensajes como leídos
- `message_deleted` - Notificar eliminación

### Servidor → Cliente
- `receive_message` - Recibir nuevo mensaje
- `messages_read` - Mensajes marcados como leídos
- `message_deleted` - Mensaje eliminado

## 🗂️ Estructura de Datos

Los datos se almacenan en archivos JSON:
- `data/users.json` - Usuarios registrados
- `data/chats.json` - Chats creados
- `data/messages.json` - Mensajes enviados

## ⚙️ Variables de Entorno

```env
NODE_ENV=production
PORT=3000
```

## 📄 Licencia

MIT License