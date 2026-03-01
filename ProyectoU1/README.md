# 🐱 KittyTasks — App de Productividad con Gatito Animado

Una aplicación web de productividad moderna, responsiva y conectada a la nube, con un adorable gatito animado como compañero.

---

## ✨ Características

- 🔐 **Autenticación**: Email/contraseña + Google Sign-In
- ✅ **Tareas**: Crear, editar, eliminar, completar con dificultad (Fácil/Normal/Difícil)
- 📁 **Proyectos**: Colaboración en tiempo real entre usuarios
- 📝 **Notas**: Con etiquetas, colores y sistema de puntaje
- ⏱️ **Cronómetro/Temporizador**: Con banderas y notificaciones
- 📅 **Calendario**: Visualización mensual de tareas con fecha límite
- 🎮 **Gamificación**: Puntos, niveles, badges, racha diaria
- 🛒 **Tienda**: Compra accesorios para tu gatito con puntos
- 👥 **Amigos**: Sistema de solicitudes y proyectos compartidos
- 🌙 **Tema claro/oscuro**
- 📱 **PWA**: Instalable como app móvil

---

## 🚀 Configuración

### 1. Crear proyecto en Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Activa:
   - **Authentication** → Email/Password y Google
   - **Firestore Database** → Modo producción o prueba
   - **Storage** (para fotos de perfil futuras)
4. Ve a **Configuración del proyecto** → **Tus apps** → Añade una app web
5. Copia la configuración `firebaseConfig`

### 2. Configurar claves en la app

Edita el archivo:

```
src/firebase/config.js
```

Reemplaza los valores con tu configuración de Firebase:

```js
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 3. Configurar reglas de Firestore

En la consola de Firebase → Firestore → Reglas, pega esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users solo ven sus propios datos
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Proyectos: solo miembros
    match /projects/{projectId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      match /{subcollection=**} {
        allow read, write: if request.auth != null;
      }
    }
    // Solicitudes de amistad
    match /friendRequests/{reqId} {
      allow read, write: if request.auth != null;
    }
    // Invitaciones a proyectos
    match /projectInvites/{invId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Correr el servidor local

Como Python ya está instalado en tu sistema:

```bash
python server.py
```

Luego abre: **http://localhost:8000**

---

## 📁 Estructura del Proyecto

```
Proyecto 1/
├── index.html              # Entrada principal de la SPA
├── server.py               # Servidor Python (sin necesidad de Node.js)
├── manifest.json           # PWA manifest → mover a /public/
├── src/
│   ├── main.js             # Router SPA + estado global + auth listener
│   ├── firebase/
│   │   ├── config.js       # ⚠️ Aquí van tus claves de Firebase
│   │   ├── init.js         # Inicialización de Firebase
│   │   ├── auth.js         # Funciones de autenticación
│   │   └── firestore.js    # CRUD + listeners en tiempo real
│   ├── components/
│   │   ├── Cat/            # 🐱 Gatito SVG animado (Cat.js + cat.css)
│   │   ├── Navbar/         # Navbar responsiva (desktop + mobile)
│   │   ├── Toast.js        # Notificaciones toast
│   │   └── Particles.js    # Partículas de celebración
│   ├── pages/
│   │   ├── Auth/           # Login, Register, ForgotPassword
│   │   ├── Dashboard/      # Lista principal de tareas
│   │   ├── Projects/       # Proyectos (lista + detalle)
│   │   ├── Notes/          # Notas con colores y etiquetas
│   │   ├── Timer/          # Cronómetro y temporizador
│   │   ├── Calendar/       # Calendario mensual
│   │   └── Profile/        # Perfil, logros, tienda, amigos
│   └── styles/
│       ├── variables.css   # Variables CSS (tema claro/oscuro)
│       ├── global.css      # Estilos globales y componentes
│       └── animations.css  # Animaciones CSS + keyframes del gato
└── public/
    └── manifest.json       # PWA manifest
```

---

## 🎮 Sistema de Puntos

| Dificultad | Puntos |
|---|---|
| 🟢 Fácil | +10 pts |
| 🟡 Normal | +25 pts |
| 🔴 Difícil | +50 pts |

**Niveles XP**: 0 → 100 → 300 → 600 → 1000 → 1500 → 2200 → 3000...

---

## 🐱 Estados del Gatito

| Estado | Cuándo aparece |
|---|---|
| `idle` | Navegando normalmente |
| `celebrating` | Al completar una tarea |
| `tea` | Cronómetro/temporizador activo |
| `working` | Editando notas o tareas |
| `tired` | Estado especial futuro |

---

## 🛒 Tienda de Accesorios

| Accesorio | Costo |
|---|---|
| 🐱 Sin accesorio | Gratis |
| 🎀 Moño rosa | 50 pts |
| 🕶️ Lentes cool | 75 pts |
| 🎩 Sombrero mágico | 100 pts |
| 👑 Corona real | 200 pts |

---

## 🔒 Seguridad

- Cada usuario **solo ve sus propios datos** (Firestore rules)
- Rutas protegidas por **Firebase Auth** (guard en `main.js`)
- Sin datos sensibles en el frontend (solo claves públicas de Firebase)
- Las claves en `config.js` son de cliente (diseñadas para ser públicas con reglas de seguridad)

---

## 📱 PWA

Para instalar como app:
1. Abre en Chrome/Edge
2. Haz clic en el ícono de instalar en la barra de direcciones

---

*Hecho con 💜 y muchos 🐱 por KittyTasks*
