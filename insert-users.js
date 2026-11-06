const { neon } = require("@neondatabase/serverless");
const bcrypt = require('bcrypt');

// Pega tu URL de Neon directamente aquí entre comillas para probar:
const sql = neon("postgresql://neondb_owner:npg_wQ2SEdlgo4uK@ep-calm-bread-bdx2i20g-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

// Lista de usuarios a registrar (solo nombre y contraseña)
const users = [
    { name: "Ricardo", password: "23371096" },
    { name: "Gregorio", password: "22370752" },
    { name: "Ariel", password: "21370851" },
    { name: "Miriam", password: "22370739" }
];

async function seedUsers() {
    try {
        console.log("Iniciando inserción de usuarios...");

        for (const user of users) {
            const existing = await sql`SELECT * FROM users WHERE name = ${user.name}`;
            if (existing.length > 0) {
                console.log(`⚠️ El usuario ${user.name} ya está registrado.`);
                continue;
            }

            const hashedPassword = await bcrypt.hash(user.password, 10);

            await sql`
                INSERT INTO users (name, password) 
                VALUES (${user.name}, ${hashedPassword})
            `;
            
            console.log(`✅ Usuario insertado con éxito: ${user.name}`);
        }

        console.log("\n🎉 ¡Todos los usuarios fueron procesados correctamente!");
    } catch (err) {
        console.error("❌ Error al insertar usuarios:", err);
    }
}

seedUsers();