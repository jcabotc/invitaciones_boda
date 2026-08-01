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

Los invitados se indican en la URL con los parámetros `adult1`, `adult2` y `child`. Por ejemplo:

```text
https://jcabotc.github.io/invitaciones_boda/?adult1=Jaime%20P%C3%A9rez&adult2=Ana%20Garc%C3%ADa&child=Luc%C3%ADa%20P%C3%A9rez
```

El formulario muestra cada nombre y solicita una confirmación individual de asistencia. Los parámetros ausentes se omiten.

## Generar los códigos QR

La lista real de invitados se guarda en `private/invitados.csv`, que está excluido de Git. Puede recrearse a partir de `private/invitados.example.csv` con las columnas `reference`, `adult1`, `adult2` y `child`.

Para generar el PDF A4, los SVG individuales, el manifiesto de control y un ZIP:

```bash
npm run generate-qr
```

Los resultados privados se crean en `output/pdf/` y `output/qr/`, también excluidos del repositorio. El PDF debe imprimirse a tamaño real o al 100 %, sin ajustar a página.
