console.log("Auth JS carregado");

const API_BASE =
  location.hostname.includes("onrender.com")
    ? "https://turism-system-backend-test.onrender.com"
    : "http://127.0.0.1:3000";

document.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("token");
  if (token) {
    window.location.href = "index.html";
    return;
  }

  const loginBox = document.getElementById("login-box");
  const registerBox = document.getElementById("register-box");

  document.getElementById("irCadastro")
    ?.addEventListener("click", () => {
      loginBox.style.display = "none";
      registerBox.style.display = "block";
    });

  document.getElementById("irLogin")
    ?.addEventListener("click", () => {
      registerBox.style.display = "none";
      loginBox.style.display = "block";
    });

  document.getElementById("btnLogin")
    ?.addEventListener("click", login);

  document.getElementById("btnRegistrar")
    ?.addEventListener("click", registrar);
});

async function login() {
  try {
    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value.trim();

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Erro no login");

    localStorage.setItem("token", data.token);
    window.location.href = "index.html";

  } catch (err) {
    alert(err.message);
  }
}

async function registrar() {
  try {
    const nome = document.getElementById("register-nome").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const senha = document.getElementById("register-senha").value.trim();

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Erro no registro");

    localStorage.setItem("token", data.token);
    window.location.href = "index.html";

  } catch (err) {
    alert(err.message);
  }
}
