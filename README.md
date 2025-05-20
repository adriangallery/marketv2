# AdrianMarket v2.0

Implementación avanzada del AdrianMarket con soporte para ofertas por rasgo, ofertas de piso y mejor integración con Alchemy.

## Características

* Listado de NFTs en el mercado
* Compra y venta de NFTs
* Ofertas por NFTs específicos (ofertas de token)
* Ofertas de piso (para cualquier NFT de una colección)
* Ofertas por rasgo (para cualquier NFT con un rasgo específico)
* Integración mejorada con Alchemy para mostrar metadatos de NFTs
* Diseño responsivo y soporte para modo oscuro

## Archivos

* `index.html` - Archivo principal HTML
* `styles.css` - Estilos CSS para la aplicación
* `app.js` - Configuración principal y funciones básicas
* `app-nft.js` - Funciones para manejar NFTs y listados
* `app-offers.js` - Funciones para manejar ofertas (token, piso, rasgo)
* `alchemy-helpers.js` - Funciones auxiliares para integración con Alchemy
* `offers.js` - Funciones para interactuar con el contrato de ofertas

## Configuración

1. Reemplaza `REPLACE_WITH_YOUR_ALCHEMY_API_KEY` en `app.js` con tu clave API de Alchemy
2. Asegúrate de que las direcciones de los contratos sean correctas:
   - `MARKET_ADDRESS`: Contrato principal del AdrianMarket
   - `TOKEN_ADDRESS`: Contrato del token $ADRIAN

## Implementación

### Requisitos previos

- Servidor web o servicio de hosting (GitHub Pages, Vercel, Netlify, etc.)
- Clave API de Alchemy para Base Mainnet

### Pasos para implementar

1. Clona este repositorio
2. Configura las claves API y direcciones de contratos
3. Sube los archivos a tu servicio de hosting
4. ¡Disfruta de tu marketplace de NFTs!

## Uso

### Crear un listado

1. Conecta tu wallet
2. Navega a la pestaña "Crear Listado"
3. Selecciona un NFT de tu wallet
4. Ingresa el precio y duración del listado
5. Haz clic en "Crear Listado"

### Hacer una oferta

Hay tres tipos de ofertas disponibles:

#### Oferta de Token (para un NFT específico)

1. Navega a la pestaña "Explorar"
2. Haz clic en "Ver Detalles" de un NFT
3. En el modal, ingresa tu oferta y haz clic en "Hacer Oferta"

#### Oferta de Piso (para cualquier NFT de una colección)

1. Conecta tu wallet
2. Abre el modal de oferta de piso desde la interfaz
3. Ingresa la dirección de la colección y la cantidad de oferta
4. Haz clic en "Crear Oferta de Piso"

#### Oferta por Rasgo (para cualquier NFT con un rasgo específico)

1. Conecta tu wallet
2. Abre el modal de oferta por rasgo desde la interfaz
3. Selecciona el tipo y valor del rasgo
4. Ingresa la cantidad de oferta
5. Haz clic en "Crear Oferta por Rasgo"

## Licencia

MIT 