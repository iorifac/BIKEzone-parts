const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const message = document.getElementById("message");

const togglePassword =
    document.getElementById("togglePassword");


/* MOSTRAR / OCULTAR CONTRASEÑA */

togglePassword.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePassword.textContent = "Ocultar";

    } else {

        passwordInput.type = "password";

        togglePassword.textContent = "Mostrar";
    }

});


/* VALIDACIÓN DEL FORMULARIO */

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = emailInput.value.trim();

    const password = passwordInput.value.trim();


    /* LIMPIAR MENSAJE */

    message.textContent = "";

    message.style.color = "";


    /* VALIDAR CAMPOS */

    if (email === "" || password === "") {

        message.textContent =
            "Por favor complete todos los campos.";

        message.style.color = "red";

        return;
    }


    /* VALIDAR CORREO */

    if (!email.includes("@")) {

        message.textContent =
            "Ingrese un correo electrónico válido.";

        message.style.color = "red";

        return;
    }


    /* VALIDAR CONTRASEÑA */

    if (password.length < 6) {

        message.textContent =
            "La contraseña debe tener mínimo 6 caracteres.";

        message.style.color = "red";

        return;
    }


    /* CONEXIÓN CON LA API DE BIKEZONE */

    const boton = loginForm.querySelector("button[type='submit']");

    if (boton) {
        boton.disabled = true;
    }

    message.textContent = "Verificando datos...";

    message.style.color = "gray";

    try {

        const respuesta = await fetch("/api/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                correo: email,
                password: password
            })

        });

        const data = await respuesta.json();

        if (data.success) {

            /* GUARDAR LA SESIÓN DEL USUARIO */

            sessionStorage.setItem(
                "usuario",
                JSON.stringify(data.usuario)
            );

            message.textContent = data.message;

            message.style.color = "green";

            setTimeout(function () {

                window.location.href = "dashboard.html";

            }, 800);

        } else {

            /* CREDENCIALES INCORRECTAS, USUARIO INACTIVO, ETC. */

            message.textContent = data.message;

            message.style.color = "red";

            if (boton) {
                boton.disabled = false;
            }

        }

    } catch (error) {

        console.error(error);

        message.textContent =
            "No se pudo conectar con el servidor.";

        message.style.color = "red";

        if (boton) {
            boton.disabled = false;
        }

    }

});