// ==========================================================
// BIKEzone Parts - Servicio web de registro e inicio de sesión
// Evidencia GA7-220501096-AA5-EV01
// ==========================================================

// Carga las variables del archivo .env (así la contraseña de la
// base de datos no queda escrita en el código ni en el repositorio)
require("dotenv").config();

// Librerías que usa el proyecto
const express = require("express");   // Para crear el servidor y las rutas de la API
const mariadb = require("mariadb");   // Para conectarse a la base de datos
const bcrypt = require("bcrypt");     // Para encriptar y comparar contraseñas
const cors = require("cors");         // Para permitir peticiones desde el navegador

const app = express();

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());                      // Permite las peticiones al servicio
app.use(express.json());              // Permite leer el cuerpo de las peticiones en formato JSON
app.use(express.static(__dirname));   // Sirve index.html, dashboard.html, css y js


// ================================
// CONEXIÓN A LA BASE DE DATOS
// ================================

// Se crea un "pool" de conexiones para reutilizarlas en cada petición.
// Los datos salen del archivo .env
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});


// ================================
// PRUEBA DE CONEXIÓN
// ================================

// GET /api/status
// Sirve para comprobar que el servidor y la base de datos están funcionando
app.get("/api/status", async (req, res) => {

    let connection;

    try {

        // Se pide una conexión al pool; si falla, salta al catch
        connection = await pool.getConnection();

        res.json({
            success: true,
            message: "BIKEzone conectado correctamente a MariaDB."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error de conexión con la base de datos."
        });

    } finally {

        // Siempre se devuelve la conexión al pool, haya error o no
        if (connection) {
            connection.release();
        }

    }

});


// ================================
// REGISTRO: CREAR USUARIO
// ================================

// POST /api/usuarios
// Recibe nombre, correo, password y rol (opcional) y guarda el usuario
app.post("/api/usuarios", async (req, res) => {

    const {
        nombre,
        correo,
        password,
        rol
    } = req.body;

    // 1. Validar que lleguen los datos obligatorios
    if (!nombre || !correo || !password) {

        return res.status(400).json({
            success: false,
            message: "Todos los campos son obligatorios."
        });

    }

    let connection;

    try {

        connection = await pool.getConnection();

        // 2. Revisar que el correo no esté registrado todavía
        const usuarioExistente = await connection.query(
            "SELECT id_usuario FROM usuarios WHERE correo = ?",
            [correo]
        );

        if (usuarioExistente.length > 0) {

            return res.status(409).json({
                success: false,
                message: "El correo ya está registrado."
            });

        }

        // 3. Encriptar la contraseña con bcrypt (nunca se guarda en texto plano)
        const passwordHash =
            await bcrypt.hash(password, 10);

        // 4. Guardar el usuario en la base de datos.
        // Se usan "?" para evitar inyección SQL.
        // Si no llega un rol, se asigna AUXILIAR por defecto.
        await connection.query(
            `INSERT INTO usuarios
            (nombre, correo, password_hash, rol)
            VALUES (?, ?, ?, ?)`,
            [
                nombre,
                correo,
                passwordHash,
                rol || "AUXILIAR"
            ]
        );

        res.status(201).json({
            success: true,
            message: "Usuario creado correctamente."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error al crear el usuario."
        });

    } finally {

        if (connection) {
            connection.release();
        }

    }

});


// ================================
// LOGIN
// ================================

// POST /api/login
// Recibe correo y password. Si son correctos responde autenticación
// satisfactoria; si no, responde error en la autenticación.
app.post("/api/login", async (req, res) => {

    const {
        correo,
        password
    } = req.body;

    // 1. Validar que lleguen los dos datos
    if (!correo || !password) {

        return res.status(400).json({
            success: false,
            message: "Correo y contraseña son obligatorios."
        });

    }

    let connection;

    try {

        connection = await pool.getConnection();

        // 2. Buscar el usuario por su correo
        const usuarios = await connection.query(
            `SELECT
                id_usuario,
                nombre,
                correo,
                password_hash,
                rol,
                estado
             FROM usuarios
             WHERE correo = ?`,
            [correo]
        );

        // 3. Si no existe, se responde con un mensaje genérico
        // (así no se revela si el correo está registrado o no)
        if (usuarios.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Credenciales incorrectas."
            });

        }

        const usuario = usuarios[0];

        // 4. Revisar que el usuario esté activo
        if (!usuario.estado) {

            return res.status(403).json({
                success: false,
                message: "El usuario está inactivo."
            });

        }

        // 5. Comparar la contraseña escrita con el hash guardado en la base de datos
        const passwordCorrecta =
            await bcrypt.compare(
                password,
                usuario.password_hash
            );

        if (!passwordCorrecta) {

            return res.status(401).json({
                success: false,
                message: "Credenciales incorrectas."
            });

        }

        // 6. Autenticación correcta: se devuelven los datos del usuario
        // (sin la contraseña ni el hash)
        res.json({

            success: true,

            message: "Inicio de sesión exitoso.",

            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Error interno del servidor."
        });

    } finally {

        if (connection) {
            connection.release();
        }

    }

});


// ================================
// INICIAR SERVIDOR
// ================================

// El servidor queda escuchando en el puerto definido arriba
app.listen(PORT, () => {

    console.log(
        BIKEzone ejecutándose en http://localhost:${PORT}
    );

});