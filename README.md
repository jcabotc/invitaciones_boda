# Formulario de boda y bautizo

Frontend del formulario de confirmación para la boda de Jaime y Jely y el bautizo de Irene.

## Arranque local

Requiere Node.js 18 o posterior.

```sh
npm start
```

El formulario estará disponible en <http://127.0.0.1:4173>.

Para usar otro puerto:

```sh
PORT=8080 npm start
```

Las respuestas se envían a un backend serverless de Google Apps Script y se guardan en una hoja privada de Google Sheets. Mientras se completa un envío, el navegador conserva una copia local temporal para permitir reintentos.

El código versionado del backend se encuentra en `apps-script/`. Su manifiesto lo despliega como aplicación web anónima que se ejecuta con los permisos del propietario.
