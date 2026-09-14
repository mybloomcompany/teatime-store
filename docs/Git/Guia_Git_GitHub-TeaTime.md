# Guía de Git y GitHub — TeaTime

## 1. Objetivo

Este documento establece las reglas de trabajo con Git y GitHub para el proyecto TeaTime, desarrollado por MYBLOOM para TeaTime Store.

El objetivo es mantener el repositorio organizado, facilitar el trabajo en equipo y evitar conflictos o cambios accidentales en las versiones principales del proyecto.

---

## 2. Estructura de ramas

El proyecto utiliza dos ramas principales:

### `main`

Contiene la versión estable del proyecto.

No se debe utilizar para desarrollar nuevas funcionalidades directamente.

### `develop`

Contiene la versión de desarrollo e integración del proyecto.

Las nuevas funcionalidades se integran primero en esta rama antes de llegar a `main`.

### Ramas `feature/*`

Se utilizan para desarrollar funcionalidades específicas.

Ejemplos:

```text
feature/auth
feature/products
feature/cart
feature/stock
feature/sales
feature/admin
feature/database
```

---

## 3. Flujo de trabajo

El flujo general del proyecto es:

```text
feature/*
    ↓
develop
    ↓
main
```

Una funcionalidad nueva debe desarrollarse en una rama `feature/*`.

Una vez terminada y probada, se integra en `develop`.

Cuando el estado de `develop` se considera estable, puede pasar a `main`.

---

## 4. Crear una rama

Antes de comenzar un nuevo trabajo, actualizar la rama `develop`:

```bash
git switch develop
git pull origin develop
```

Crear una nueva rama:

```bash
git switch -c feature/nombre-de-la-funcionalidad
```

Ejemplo:

```bash
git switch -c feature/products
```

---

## 5. Commits

Los commits deben ser claros y describir qué se modificó.

Se utilizará la siguiente convención:

### `feat`

Para agregar una nueva funcionalidad.

```text
feat: agregar catálogo de productos
```

### `fix`

Para corregir un error.

```text
fix: corregir cálculo del total del carrito
```

### `docs`

Para modificar documentación.

```text
docs: actualizar guía de GitHub
```

### `style`

Para cambios de formato o estilos que no modifican la lógica.

```text
style: ajustar estilos del catálogo
```

### `refactor`

Para reorganizar o mejorar código sin cambiar su comportamiento.

```text
refactor: reorganizar servicio de productos
```

### `test`

Para agregar o modificar pruebas.

```text
test: agregar pruebas de autenticación
```

### `chore`

Para tareas de configuración o mantenimiento.

```text
chore: actualizar dependencias
```

---

## 6. Buenas prácticas para los commits

Los commits deben:

* Describir claramente el cambio realizado.
* Ser relativamente pequeños y específicos.
* Evitar mensajes genéricos como `cambios`, `arreglos` o `update`.
* No mezclar funcionalidades completamente diferentes en un mismo commit.
* Realizarse después de comprobar que los cambios funcionan.

Ejemplo correcto:

```text
feat: agregar búsqueda de productos
```

Ejemplo incorrecto:

```text
cambios
```

---

## 7. Subir una rama

Después de realizar los cambios:

```bash
git status
git add .
git commit -m "feat: descripción del cambio"
git push -u origin feature/nombre-de-la-funcionalidad
```

---

## 8. Pull Requests

Las funcionalidades terminadas deben integrarse mediante un Pull Request.

Flujo:

```text
feature/*
    ↓
Pull Request
    ↓
develop
```

El Pull Request debe explicar:

* Qué se hizo.
* Por qué se hizo.
* Qué se probó.
* Si existe algún aspecto pendiente.

Antes de solicitar la integración, se debe comprobar que el código funciona correctamente.

---

## 8.5. Revisión de Pull Requests

Los Pull Requests destinados a `develop` y `main` deberán pasar por una revisión antes de ser integrados.

El repositorio utiliza CODEOWNERS para definir a los responsables de revisión.

Se requiere al menos una aprobación de un Code Owner antes de realizar el merge.

Las aprobaciones pueden quedar invalidadas si se agregan nuevos cambios al Pull Request, por lo que el código deberá volver a ser revisado cuando corresponda.

---

## 9. Actualizar una rama de trabajo

Si `develop` recibió cambios mientras se estaba trabajando en una funcionalidad:

```bash
git switch develop
git pull origin develop
```

Luego se puede actualizar la rama de trabajo según la estrategia acordada por el equipo.

---

## 10. No trabajar directamente sobre `main`

No se deben realizar cambios directamente sobre `main`.

`main` representa la versión estable del proyecto.

El desarrollo se realiza en ramas `feature/*` y posteriormente se integra en `develop`.

---

## 11. Antes de realizar un Pull Request

Comprobar:

* [ ] El código funciona.
* [ ] La funcionalidad fue probada.
* [ ] No hay archivos innecesarios.
* [ ] No se subieron contraseñas, claves o archivos `.env`.
* [ ] El commit tiene un mensaje descriptivo.
* [ ] La rama corresponde a la funcionalidad desarrollada.
* [ ] La documentación fue actualizada si era necesario.

---

## 12. Estructura general del repositorio

La estructura inicial del proyecto será:

```text
teatime-store/
│
├── .github/
│   ├── CODEOWNERS
│   └── pull_request_template.md
│
├── api/
├── client/
│
├── docs/
│   └── git/
│       └── guia-github.md
│
├── .gitignore
└── README.md
```

---

## 13. Tecnologías principales

El proyecto utilizará:

* React
* JavaScript
* Node.js
* Express
* Sequelize
* PostgreSQL
* DBeaver
* Postman
* Figma
* Git
* GitHub

---

## 14. Equipo

Proyecto desarrollado por:

* Matías
* Milagros
* Yuriel

**MYBLOOM — TeaTime**

Sistema web de ecommerce y gestión administrativa desarrollado para TeaTime Store.
