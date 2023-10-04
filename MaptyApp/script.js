"use strict";

///////////////////////////////TO DO///////////////////////////////
// 1. Refactor the code
// 3. Ability to edit a workout
// 4. Ability to sort workouts by a certain field (e.g. distance)
// 5. Re-build Running and Cycling objects coming from Local Storage
// 6. More realistic error and confirmation messages
// 7. Ability to position the map to show all workouts
// 8. bility to draw lines and shapes instead of just points
// 9. Geocode location from coordinates (“Run in Faro, Portugal”)
// 10. Display weather data for workout time and place

// Selecting DOM elements
const form = document.querySelector(".form");
const formEdit = document.querySelector(".form--edit");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const resetBtn = document.getElementById("reset__btn");

///////////////////////////////WORKOUT CLASSES///////////////////////////////

// Define a base class for all workouts
class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  // Helper method to set the workout description based on type and date
  _setDescription() {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

// Create a subclass for Running workouts
class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // Calculate pace (min/km) for running workouts
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Create a subclass for Cycling workouts
class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  // Calculate speed (km/h) for cycling workouts
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////APPLICATION ARCHITECTURE///////////////////////////////

// Define the main application class
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 15;
  #markers = new L.LayerGroup(); // keep track of the markers

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    containerWorkouts.addEventListener("click", this._removeWorkout.bind(this));
    resetBtn.addEventListener("click", this._resetAll.bind(this));
    this._getRemoveButton();
  }

  // Get the user's current position
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert("To use this app, you need to enable location services");
      });
    }
  }

  // Get workouts from local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workout"));
    this._toggleResetHidden(data);
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach((work) => this._renderWorkout(work));
  }

  _setLocalStorage() {
    localStorage.setItem("workout", JSON.stringify(this.#workouts));
  }

  _getRemoveButton() {
    document.addEventListener("DOMContentLoaded", () => {
      const deleteBtn = document.querySelector(".form__btn--delete");
      if (!deleteBtn) return;
      deleteBtn.addEventListener("click", this._removeWorkout.bind(this));
    });
  }

  // Load the map with the user's position
  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    // Add OpenStreetMap tile layer
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords).addTo(this.#map).bindPopup("Your Location").openPopup();

    // Handling clicks on the map
    this.#map.on("click", this._showForm.bind(this));
    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  // Show the workout form on the map
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  // Hide the workout form
  _hideForm() {
    // Empty the input fields
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  // Create a new workout based on form data
  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) => inputs.every((inp) => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every((inp) => inp > 0);

    // Get the data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;

    let workout;

    // If the workout is running, create a Running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (!validInputs(distance, duration, cadence) || !isPositive(distance, duration, cadence)) return alert("Inputs have to be positive numbers");
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If the workout is cycling, create a Cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (!validInputs(distance, duration, elevation) || !isPositive(distance, duration)) return alert("Inputs have to be positive numbers");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add the new workout to the workouts array
    this.#workouts.push(workout);

    // Render the workout on the map as a marker
    this._renderWorkoutMarker(workout);

    // Render the workout on the list
    this._renderWorkout(workout);

    // Hide the form and clear the input fields
    this._hideForm();

    // Set local storage for all workouts
    this._setLocalStorage();
    this._toggleResetHidden(workout);
  }

  _resetAll() {
    const workoutElements = document.querySelectorAll(".workout");
    workoutElements.forEach((workoutElement) => workoutElement.remove());
    // Remove the workout data from local storage
    localStorage.removeItem("workout");
    this._toggleResetHidden();
    this.#workouts.forEach((workout) => {
      this._removeWorkoutMarker(workout);
    });
    this.#workouts = [];
    this._hideForm();
    this._toggleResetHidden();
  }

  _removeWorkout(e) {
    const deleteBtn = e.target.closest(".form__btn--delete");
    if (!deleteBtn) return;

    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    const workout = this.#workouts.find((work) => work.id === workoutEl.dataset.id);
    this.#workouts = this.#workouts.filter((work) => work.id !== workoutEl.dataset.id);
    this._removeWorkoutMarker(workout);
    workoutEl.remove();
    this._setLocalStorage();
    this._toggleResetHidden(this.#workouts);
  }

  // Set local storage for workouts

  _toggleResetHidden(data) {
    resetBtn.classList.toggle("hidden", !data || data.length === 0);
  }

  // Toggle the display of elevation and cadence fields based on workout type
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  //Add workout markers to the map
  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 200,
          autoClose: false,
          closeOnClick: false,
          keepInView: true,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`)
      .openPopup();
    this.#markers.addLayer(marker); // add the marker to the markers group
    this.#map.addLayer(this.#markers); // add the markers group to the map
  }

  //Remove marker from map
  _removeWorkoutMarker(workout) {
    const marker = this.#markers.getLayers().find((layer) => layer.getLatLng().equals(workout.coords));
    if (marker) {
      this.#markers.removeLayer(marker); // remove the marker from the markers group
    }
  }

  // Render a workout in the workout list
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🕐</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === "running") {
      html += ` 
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
        `;
    }

    if (workout.type === "cycling") {
      html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
              </div>
        `;
    }
    html += `
      
        <button class="form__btn form__btn--delete" data-id="${workout.id}">Delete Workout</button>
        <button class="form__btn form__btn--edit" data-id="${workout.id}">Edit Workout</button>
      </li>`;

    form.insertAdjacentHTML("afterend", html);
  }

  // Move the map view to the clicked workout
  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    const workout = this.#workouts.find((work) => work.id === workoutEl.dataset.id);

    if (!workout) return;
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
}

// Create an instance of the App class
const app = new App();
