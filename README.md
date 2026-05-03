# 👻 Ghost-Share

**Ghost-Share** es una Progressive Web App (PWA) de transferencia de archivos punto a punto (P2P) diseñada para la privacidad y la velocidad. Utiliza el protocolo **WebRTC** para conectar dispositivos directamente sin pasar por un servidor intermedio, utilizando códigos QR para el intercambio de señales (signaling) manual.

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)

## 🚀 Características Principales

- **Zero-Server Architecture**: No requiere backend. La conexión se establece directamente entre navegadores.
- **Manual signaling via QR**: Intercambio de ofertas y respuestas SDP mediante escaneo de cámara. 100% privado.
- **Chunked File Transfer**: Envío de archivos en fragmentos de 16KB para evitar el desbordamiento de memoria en dispositivos móviles.
- **Mobile-First UI**: Interfaz oscura, minimalista y optimizada para pantallas táctiles.
- **Seguridad**: Cifrado de extremo a extremo nativo de WebRTC.
- **PWA**: Instalable en tu dispositivo para acceso rápido.

## 🛠️ Stack Tecnológico

- **Framework**: React 19 + Vite + TypeScript.
- **Estilos**: Tailwind CSS.
- **Iconos**: Lucide React.
- **Animaciones**: Motion (framer-motion).
- **Librerías QR**: `html5-qrcode` (escáner) y `qrcode.react` (generación).

## 📖 Instrucciones de Uso

### Para el Emisor:
1. Abre Ghost-Share y haz clic en **"Enviar"**.
2. Selecciona el archivo que deseas compartir.
3. Se generará un código QR con la **Oferta WebRTC**. Muéstralo al receptor.
4. Una vez que el receptor escanee tu oferta, él generará una **Respuesta QR**. Escanéala con tu cámara.
5. La conexión se establecerá y el archivo comenzará a enviarse automáticamente.

### Para el Receptor:
1. Abre Ghost-Share y haz clic en **"Recibir"**.
2. Escanea el código QR del emisor.
3. Tu dispositivo generará una **Respuesta QR**. Muéstrasela al emisor.
4. Espera a que el emisor escanee tu respuesta.
5. El archivo se descargará automáticamente al completar la transferencia.

## 💻 Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```

## 📦 Despliegue en GitHub Pages

Esta aplicación está lista para ser desplegada en GitHub Pages de forma gratuita.

1.  Asegúrate de que el nombre de tu repositorio coincida con el `base` definido en `vite.config.ts` (por defecto es `./`).
2.  Ejecuta el script de construcción:
    ```bash
    npm run build
    ```
3.  Sube el contenido de la carpeta `dist` a la rama `gh-pages` o configura GitHub Actions para desplegar automáticamente.

### Configuración automática con `gh-pages` package:
1. Instala el paquete: `npm install --save-dev gh-pages`
2. Añade a tu `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
3. Ejecuta: `npm run deploy`

## ⚙️ Detalles Técnicos

- **WebRTC DataChannel**: Implementado con `ordered: true` para garantizar la integridad de los fragmentos del archivo.
- **STUN Servers**: Utiliza los servidores públicos de Google (`stun:stun.l.google.com:19302`) para el descubrimiento de IPs detrás de NAT.
- **Memory Management**: Los archivos se reconstruyen usando un array de `Uint8Array` que finalmente se convierte en un `Blob`, optimizando el uso de RAM en navegadores móviles.

---
*Desarrollado bajo principios de privacidad y soberanía digital.*
