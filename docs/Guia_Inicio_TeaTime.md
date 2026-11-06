# Guía de inicio — TeaTime

Esta guía explica cómo poner en marcha TeaTime en una computadora con Windows, desde cero. Seguila en orden y copiá los comandos de a uno.

**Cómo se comprobó:** los comandos se ejecutaron el 06/11/2026 en Windows 11 con PowerShell 5.1, Node.js 24.14.1, npm 11.11 y PostgreSQL 18.3, sobre una copia limpia del proyecto y una base temporal. La sección final indica lo que no se pudo comprobar.

---

## A. Antes de empezar

- **Qué es una terminal:** una ventana donde se escriben comandos. Usamos **Windows PowerShell**: abrí el menú Inicio y escribí `PowerShell`.
- **Qué es una carpeta de trabajo:** cada comando se ejecuta en una carpeta. PowerShell la muestra a la izquierda, por ejemplo `PS C:\Dev\teatime-store\api>`.
- **Comando para moverse:** `cd` entra en una carpeta. `cd ..` vuelve a la anterior.
- **Por qué `npm.cmd`:** en muchas computadoras PowerShell bloquea `npm` con el error "running scripts is disabled". `npm.cmd` funciona siempre y no hay que cambiar ninguna configuración de Windows.

El sistema tiene dos partes y las dos deben estar encendidas al mismo tiempo:

| Parte | Carpeta | Dirección |
|---|---|---|
| Backend (API) | `api` | http://localhost:3000 |
| Frontend (la página) | `client` | http://localhost:5173 |

---

## B. Instalar las herramientas

Solo se hace una vez. Si ya tenés alguna, verificala con el comando de la tabla.

| Programa | Dónde | Para verificar |
|---|---|---|
| **Git** | https://git-scm.com/download/win | `git --version` |
| **Node.js** versión 20.19 o superior (elegí la LTS) | https://nodejs.org | `node -v` |
| **PostgreSQL** (se probó con la 18) | https://www.postgresql.org/download/windows/ | ver abajo |
| **Visual Studio Code** (opcional, para editar) | https://code.visualstudio.com | |

Instalá con las opciones predeterminadas. El instalador de PostgreSQL te pide una **contraseña del usuario `postgres`**: anotala en un lugar seguro, la vas a necesitar. No la compartas ni la subas al repositorio.

Después de instalar, **cerrá y volvé a abrir PowerShell**. Para comprobar PostgreSQL:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
```

Si instalaste otra versión, cambiá el `18` de la ruta por tu versión en este y en los demás comandos.

---

## C. Obtener el proyecto

1. Elegí una carpeta para tus proyectos. Por ejemplo, para usar `C:\Dev`:

```powershell
New-Item -ItemType Directory -Force C:\Dev
```

```powershell
cd C:\Dev
```

2. Descargá el proyecto:

```powershell
git clone https://github.com/mybloomcompany/teatime-store.git
```

3. Entrá a la carpeta:

```powershell
cd teatime-store
```

4. Pasate a la rama de trabajo. **Preguntá cuál es a quien coordina el repositorio** y reemplazá `nombre-de-la-rama`:

```powershell
git switch nombre-de-la-rama
```

5. Comprobá que estás en el lugar correcto. Tienen que aparecer las carpetas `api`, `client`, `docs` y `sql`:

```powershell
Get-ChildItem -Name
```

---

## D. Configurar el proyecto

### 1. Crear la base de datos

Parada en la carpeta `teatime-store`. Cada comando te pide la contraseña de `postgres`; al escribirla no se ve nada en pantalla, es normal.

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE teatime"
```

Creá las tablas, **en este orden**:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d teatime -f sql\TeaTime.sql
```

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d teatime -f sql\TeaTime_cambios_v2.sql
```

Comprobá que hay 23 tablas:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d teatime -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public'"
```

> No ejecutes `sql\BD_original.sql`. No forma parte de la instalación.

### 2. Instalar el backend

```powershell
cd api
```

```powershell
npm.cmd install
```

Puede aparecer un aviso de `vulnerabilities`. **No ejecutes `npm audit fix`**, cambiaría dependencias del proyecto; avisá a quien coordina si te preocupa.

### 3. Crear tu archivo de configuración

```powershell
Copy-Item .env.example .env
```

Abrí el archivo `api\.env` con Visual Studio Code o el Bloc de notas, y cambiá estos valores:

| Variable | Qué poner |
|---|---|
| `DB_PASSWORD` | La contraseña de `postgres` que elegiste al instalar |
| `JWT_SECRET` | Una frase larga inventada por vos |
| `SEED_PASSWORD` | Una contraseña inventada para las cuentas de prueba |

Dejá el resto como está y guardá. El archivo `.env` es personal: **nunca lo compartas ni lo subas**. Git ya está configurado para ignorarlo.

### 4. Cargar los datos de prueba

```powershell
npm.cmd run seed
```

Tiene que terminar con `Datos de prueba cargados.`

### 5. Instalar el frontend

```powershell
cd ..\client
```

```powershell
npm.cmd install
```

---

## E. Levantar el sistema

Necesitás **dos ventanas de PowerShell abiertas**. No las cierres mientras uses el sistema. Ajustá la ruta si elegiste otra carpeta.

**Ventana 1, backend:**

```powershell
cd C:\Dev\teatime-store\api
```

```powershell
npm.cmd start
```

Tiene que decir: `Servidor corriendo en el puerto 3000. Base de datos conectada.`

**Ventana 2, frontend:**

```powershell
cd C:\Dev\teatime-store\client
```

```powershell
npm.cmd run dev
```

Tiene que mostrar: `Local: http://localhost:5173/`

**Para comprobar que todo funciona:**

1. Abrí http://localhost:5173 en el navegador.
2. En **Productos** tienen que aparecer **11 productos**.
3. Iniciá sesión con `cliente@teatime.test` y la contraseña que pusiste en `SEED_PASSWORD`.

| Rol | Correo |
|---|---|
| Administrador | `admin@teatime.test` |
| Vendedor | `vendedor@teatime.test` |
| Vendedor | `vendedor2@teatime.test` |
| Cliente | `cliente@teatime.test` |

**Para apagarlo:** en cada ventana, presioná `Ctrl + C`. La próxima vez solo repetí esta sección E.

---

## F. Problemas frecuentes

| Qué ves | Qué significa | Qué hacer |
|---|---|---|
| `npm : ... running scripts is disabled on this system` | Windows bloquea `npm` | Usá `npm.cmd`. No cambies la configuración de Windows |
| `npm error code ENOENT` y `package.json` | Estás en la carpeta equivocada | Entrá a `api` o `client` con `cd` |
| `Falta SEED_PASSWORD en api/.env` | No creaste el `.env`, le falta esa línea o no estás en la carpeta `api` | Revisá el paso D.3 y entrá a `api` |
| `Falta JWT_SECRET en el archivo .env` | No creaste el `.env`, o no estás en la carpeta `api` | Hacé el paso D.3 y entrá a `api` |
| `la autentificación password falló` | La contraseña en `DB_PASSWORD` no es correcta | Corregila en `api\.env` |
| `no existe la base de datos` | No creaste la base o `DB_NAME` está mal | Hacé el paso D.1 y revisá `api\.env` |
| `psql.exe` no se encuentra | Otra versión u otra carpeta de PostgreSQL | Cambiá el `18` en la ruta |
| Vite dice `Port 5173 is in use` y usa otro puerto | Ya hay otro frontend encendido | Cerralo y volvé a iniciar. El backend solo acepta el puerto 5173 |
| El backend dice que corre, pero no responde lo esperado | Puede haber otro backend encendido en el puerto 3000: en ese caso el mensaje de éxito igual aparece | Cerrá la otra ventana y volvé a iniciar |
| En la página: `No se pudo conectar…` | El backend está apagado | Revisá la ventana 1 |
| Al abrir http://localhost:3000 aparece un error 404 | Es normal: la página está en el puerto 5173 | Abrí http://localhost:5173 |

**Pedí ayuda** antes de borrar carpetas o bases de datos, y cuando el error no esté en esta tabla. Copiá el texto completo del error, sin incluir contraseñas.

---

## G. Git básico y seguro

### Antes de ejecutar cualquier comando de Git

Comprobá en qué carpeta y en qué rama estás:

```powershell
git branch --show-current
```

```powershell
git status
```

`git status` te dice qué archivos cambiaste. Si dice `fatal: not a git repository`, no estás en la carpeta del proyecto.

### Descargar los últimos cambios

Con la rama indicada, y sin cambios propios pendientes:

```powershell
git pull origin nombre-de-la-rama
```

Si después de descargar cambian las dependencias, repetí `npm.cmd install` en `api` y en `client`.

### Qué no modificar sin avisar

- `api\.env` no se comparte ni se sube.
- `sql\`: el esquema de la base lo modifica solo quien coordina.
- `package-lock.json`, `.gitignore` y `.github\`.
- Las ramas `main` y `develop`: no trabajes directamente sobre ellas.

### Cómo evitar conflictos

- Descargá los cambios antes de empezar.
- Avisá en qué archivos vas a trabajar, sobre todo los grandes como `client\src\components\Admin\Gestion.jsx`.
- Hacé cambios pequeños y frecuentes.

### Cuándo avisar antes de seguir

Pará y pedí ayuda si aparece `CONFLICT`, si Git te pide un mensaje que no esperabas, o si estás por usar `git reset`, `git push --force` o `git clean`. Estos tres últimos pueden hacerte perder trabajo.

Para crear ramas, hacer commits y abrir Pull Requests, seguí [la guía de Git del proyecto](Git/Guia_Git_GitHub-TeaTime.md).

---

## Qué no se pudo comprobar

| Paso | Motivo | Cómo se comprobó en su lugar |
|---|---|---|
| Instaladores de Git, Node y PostgreSQL | Ya estaban instalados | Solo se revisaron las versiones |
| `git clone`, `git switch` a la rama y `git pull` | Las operaciones con el repositorio remoto las hace solo el responsable | Se usó una copia limpia de los archivos del proyecto |
| Pedido de contraseña de `psql` | La prueba pasó la contraseña por variable de entorno | Los comandos SQL se ejecutaron igual y sin errores |
| Edición manual de `.env` | Se escribieron los valores por script | La API arrancó y conectó con esos valores |

La persona responsable del repositorio debería probar la sección C en una computadora limpia después de subir los cambios.
