# Mapty

Mapty is a browser-based workout tracker built with vanilla JavaScript and Leaflet. It lets you log running and cycling workouts on a map, stores them in local storage, and restores them on reload.

## Features

- Track running and cycling workouts by clicking on the map
- Calculate running pace and cycling speed automatically
- Persist workouts in local storage
- Jump to a workout marker from the workout list
- Delete individual workouts or reset the full workout history

## Project Structure

- `MaptyApp/index.html`: main app entry point
- `MaptyApp/script.js`: application logic
- `MaptyApp/style.css`: styles

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Serve the repository root with a static file server.
3. Open `MaptyApp/index.html` in the browser through that server.
4. Allow location access when prompted.

Because the app uses geolocation, running it on `localhost` or another secure origin is recommended.

## License

This project is licensed under the WTFPL. See [LICENSE](LICENSE) for details.
