# Requirements Document

## Introduction

Una aplicación web tipo Strava que permite a los usuarios registrar y visualizar actividades físicas mediante la importación de archivos GPX exportados desde otras aplicaciones. La aplicación proporcionará funcionalidades para gestionar actividades, visualizar estadísticas en un dashboard y generar mapas compartibles en redes sociales.

## Glossary

- **GPX_Activity_Tracker**: El sistema de aplicación web principal
- **GPX_File**: Archivo de formato GPS Exchange que contiene datos de ubicación y tiempo de una actividad física
- **Activity**: Registro de una sesión de ejercicio físico con datos de ubicación, tiempo, distancia y otros métricas
- **Dashboard**: Interfaz que muestra estadísticas y resúmenes de las actividades del usuario
- **Activity_List**: Vista que muestra todas las actividades registradas por el usuario
- **Map_Generator**: Componente que crea mapas visuales de las actividades para compartir
- **SQLite_Database**: Base de datos local que almacena la información de las actividades

## Requirements

### Requirement 1

**User Story:** Como usuario activo, quiero importar archivos GPX de mis actividades físicas, para que pueda registrar mis entrenamientos sin tener que introducir datos manualmente.

#### Acceptance Criteria

1. WHEN el usuario selecciona un archivo GPX válido, THE GPX_Activity_Tracker SHALL procesar el archivo y extraer los datos de ubicación, tiempo y métricas de la actividad
2. IF el archivo GPX está corrupto o no es válido, THEN THE GPX_Activity_Tracker SHALL mostrar un mensaje de error específico al usuario
3. WHEN el procesamiento del archivo GPX es exitoso, THE GPX_Activity_Tracker SHALL almacenar la actividad en la SQLite_Database
4. THE GPX_Activity_Tracker SHALL validar que el archivo tenga la extensión .gpx antes de procesarlo
5. WHEN se importa una actividad, THE GPX_Activity_Tracker SHALL calcular automáticamente la distancia total, duración y velocidad promedio

### Requirement 2

**User Story:** Como usuario, quiero ver una lista de todas mis actividades registradas, para que pueda revisar mi historial de entrenamientos.

#### Acceptance Criteria

1. THE GPX_Activity_Tracker SHALL mostrar todas las actividades almacenadas en la Activity_List ordenadas por fecha más reciente
2. WHEN el usuario accede a la Activity_List, THE GPX_Activity_Tracker SHALL mostrar para cada actividad la fecha, tipo de actividad, distancia y duración
3. WHEN el usuario hace clic en una actividad específica, THE GPX_Activity_Tracker SHALL mostrar los detalles completos de esa actividad
4. IF no hay actividades registradas, THEN THE GPX_Activity_Tracker SHALL mostrar un mensaje indicando que no hay actividades y una opción para agregar la primera
5. THE GPX_Activity_Tracker SHALL permitir al usuario eliminar actividades de la lista

### Requirement 3

**User Story:** Como usuario, quiero ver un dashboard con estadísticas de mis actividades, para que pueda monitorear mi progreso y rendimiento general.

#### Acceptance Criteria

1. THE GPX_Activity_Tracker SHALL mostrar en el Dashboard la distancia total acumulada de todas las actividades
2. THE GPX_Activity_Tracker SHALL calcular y mostrar el número total de actividades registradas
3. THE GPX_Activity_Tracker SHALL mostrar la actividad más larga por distancia y por tiempo
4. WHEN hay actividades registradas, THE GPX_Activity_Tracker SHALL mostrar estadísticas del mes actual comparadas con el mes anterior
5. THE GPX_Activity_Tracker SHALL actualizar automáticamente las estadísticas del Dashboard cuando se agreguen nuevas actividades

### Requirement 4

**User Story:** Como usuario, quiero generar mapas visuales de mis actividades, para que pueda compartir mis rutas en redes sociales.

#### Acceptance Criteria

1. WHEN el usuario selecciona una actividad, THE GPX_Activity_Tracker SHALL generar un mapa visual que muestre la ruta completa de la actividad
2. THE Map_Generator SHALL renderizar la ruta usando los datos de coordenadas GPS del archivo GPX
3. THE GPX_Activity_Tracker SHALL permitir al usuario personalizar el estilo del mapa (colores, grosor de línea)
4. WHEN el mapa está generado, THE GPX_Activity_Tracker SHALL proporcionar opciones para descargar el mapa como imagen
5. THE Map_Generator SHALL incluir información básica de la actividad en el mapa (distancia, tiempo, fecha)

### Requirement 5

**User Story:** Como usuario, quiero que mis datos se almacenen de forma persistente, para que no pierda mi información cuando cierre la aplicación.

#### Acceptance Criteria

1. THE GPX_Activity_Tracker SHALL utilizar SQLite_Database para almacenar permanentemente todas las actividades
2. WHEN la aplicación se inicia, THE GPX_Activity_Tracker SHALL cargar automáticamente todas las actividades desde la SQLite_Database
3. THE GPX_Activity_Tracker SHALL mantener la integridad de los datos almacenados incluso si la aplicación se cierra inesperadamente
4. THE SQLite_Database SHALL almacenar todos los puntos GPS, métricas calculadas y metadatos de cada actividad
5. THE GPX_Activity_Tracker SHALL crear automáticamente la estructura de la base de datos si no existe al iniciar la aplicación