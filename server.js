require("dotenv").config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { neon } = require("@neondatabase/serverless");

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Conexión a Neon PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_wQ2SEdlgo4uK@ep-calm-bread-bdx2i20g-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

const JWT_SECRET = process.env.JWT_SECRET || 'escudo360_clave_secreta';

// ==========================================
// 1. RUTAS DE AUTENTICACIÓN
// ==========================================

// INICIO DE SESIÓN (LOGIN POR NOMBRE DE USUARIO)
app.post('/api/auth/login', async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: 'Debes proporcionar usuario y contraseña' });
    }

    try {
        // Buscar usuario por nombre en la base de datos de Neon
        const users = await sql`SELECT * FROM users WHERE name = ${name}`;
        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

        // Validar contraseña con bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar Token JWT
        const token = jwt.sign(
            { id: user.id, name: user.name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Inicio de sesión exitoso',
            token,
            user: { id: user.id, name: user.name }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// ==========================================
// 2. RUTA PARA GUARDAR PEDIDOS (PENDIENTE DE ENVÍO)
// ==========================================
app.post('/api/orders', async (req, res) => {
    const orderData = req.body;

    if (!orderData || !orderData.items || orderData.items.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío o los datos son inválidos' });
    }

    try {
        const reference = orderData.reference || 'ESC-' + Date.now().toString().slice(-8);
        const status = 'pendiente_de_envio'; // Asignamos el estado solicitado
        
        const customer = orderData.customer || {};
        const totals = orderData.totals || {};

        // Inserción en Neon PostgreSQL usando @neondatabase/serverless
        const result = await sql`
            INSERT INTO orders (
                reference, status, customer_name, customer_street, 
                customer_neighborhood, municipality, customer_zip, 
                customer_phone, customer_email, shipping_method, 
                payment_method, total_amount, items
            ) VALUES (
                ${reference}, 
                ${status}, 
                ${customer.n || ''}, 
                ${customer.c || ''}, 
                ${customer.col || ''}, 
                ${orderData.municipality || ''}, 
                ${customer.zip || ''}, 
                ${customer.phone || ''}, 
                ${customer.email || ''}, 
                ${orderData.shipping || 'standard'}, 
                ${orderData.payment || 'delivery'}, 
                ${totals.tot || 0}, 
                ${JSON.stringify(orderData.items)}
            )
            RETURNING reference, status;
        `;

        res.status(201).json({
            message: 'Pedido registrado con éxito',
            order: {
                reference: result[0].reference,
                status: result[0].status
            }
        });
    } catch (err) {
        console.error('Error al guardar el pedido en Neon:', err);
        res.status(500).json({ error: 'Error interno al procesar el pedido' });
    }
});

// ==========================================
// 3. INICIO DEL SERVIDOR (SIEMPRE HASTA EL FINAL)
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
});