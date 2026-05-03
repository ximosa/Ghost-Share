# 👻 Ghost-Share

**Ghost-Share** es una herramienta de transferencia de archivos punto a punto (P2P) ultra-segura, rápida y privada. A diferencia de otros servicios, los archivos **nunca se suben a un servidor**; viajan directamente desde un dispositivo a otro mediante un túnel cifrado **WebRTC**.

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![PeerJS](https://img.shields.io/badge/P2P-PeerJS-orange)

## 🚀 ¿Por qué Ghost-Share?

- **Privacidad Total**: No hay servidores de almacenamiento. Tu archivo solo existe en el emisor y el receptor.
- **Sin Límites**: Al ser una conexión directa, el tamaño del archivo solo depende de la memoria de tus dispositivos.
- **Enlaces Mágicos**: Olvídate de los códigos QR. Comparte un enlace y conéctate al instante.
- **Envío Automático**: En cuanto el receptor abre el enlace, la transferencia comienza sola.
- **Seguridad Nativa**: Utiliza el cifrado de grado militar de WebRTC.

## 🛠️ Stack Tecnológico

- **Framework**: React 19 + Vite + TypeScript.
- **P2P Engine**: [PeerJS](https://peerjs.com/) (WebRTC).
- **Estilos**: Vanilla CSS + Tailwind.
- **Iconos**: Lucide React.
- **Animaciones**: Motion (framer-motion).

## 📖 Instrucciones de Uso

### 1. Para el Emisor (Ordenador/Móvil):
1. Entra en [Ghost-Share](https://ximosa.github.io/Ghost-Share/).
2. Pulsa el botón central **"Enviar Archivo"**.
3. Selecciona el archivo que quieres compartir.
4. Pulsa el botón **"Copiar Enlace para enviar"**.
5. Envía ese enlace al receptor (por WhatsApp, Telegram, email, etc.).
6. **IMPORTANTE**: No cierres la web hasta que la transferencia termine.

### 2. Para el Receptor:
1. Abre el enlace que has recibido.
2. La aplicación se conectará automáticamente al emisor.
3. Verás la barra de progreso. Al llegar al 100%, aparecerá un botón verde de **"GUARDAR ARCHIVO"**.
4. Pulsa el botón y el archivo se guardará en tu carpeta de **Descargas**.

## 💻 Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```

## 📦 Despliegue

La aplicación se despliega automáticamente en GitHub Pages mediante:
```bash
npm run deploy
```

---
*Ghost-Share: Tu propio túnel privado para mover archivos sin dejar rastro.*
