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

// Conexión a Neon PostgreSQL (Usa la variable de entorno o la cadena directa como respaldo)
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_wQ2SEdlgo4uK@ep-calm-bread-bdx2i20g-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

const JWT_SECRET = process.env.JWT_SECRET || 'escudo360_clave_secreta';

// ==========================================
// RUTAS DE AUTENTICACIÓN
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
// INICIO DEL SERVIDOR (PUERTO DINÁMICO DE RENDER)
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
});