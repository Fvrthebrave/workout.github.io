'use script'

/** When binding "this" within the class on this page, callbacks also work to avoid doing so. *
 * 
 * Ex
 *      form.addEventListener('click', e => {
 *          this.__newWorkout(e);
 *      });
 * 
 *      vs
 * 
 *      form.addEventListener('click', this.__newWorkout.bind(this));
 * 
 * */

class Workout {
    id = (Date.now() + '').slice(-10);
    date = new Date();

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in minutes
    }

    // This will be inherited to children and not actually called on a workout object.
    __setDesc() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}.`
    }
}

class Running extends Workout {
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.type = 'running';
        this.calcPace();
        this.__setDesc();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration)
        this.elevation = elevation;
        this.type = 'cycling';
        this.calcSpeed();
        this.__setDesc();
    }

    calcSpeed() {
        // km/hr
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

///////////////////////////////////////////////////
// Application Architecture
// Class for Application.

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let markers = [];

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        this.__getPosition();

        // Handle form submission.
        form.addEventListener('submit', this.__newWorkout.bind(this));
        
        // Handle changes in workout type dropdown.
        inputType.addEventListener('change', this.__toggleElevationField.bind(this));

        containerWorkouts.addEventListener('click', this.__moveToPopup.bind(this));
    }

    // Get position of user.
    __getPosition() {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this.__loadMap.bind(this), () => {
                alert('Could not get your position.');
            });
        }
    }

    // Load map at user's current position.
    __loadMap(pos) {
        const {latitude, longitude} = pos.coords;
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Handling clicks on map.
        this.#map.on('click', this.__showForm.bind(this));
    }

    // Displays sidebar form.
    __showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus(); 
    }

    // Toggles between elevation and cadence fields based on workout type.
    __toggleElevationField() {
        // Clear input fields.
        this.__clearFormInputs();

        // Toggle hidden for form rows.
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    // Adds workout to map and clears inputs.
    __newWorkout(e) {
        // Checks if each input is a number. Returns false and fails if not.
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp))
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        if(type === 'running') {
            const cadence = +inputCadence.value;


            // Check that data is valid.
            if
              (
                !validInputs(distance, duration, cadence) || 
                !allPositive(distance, duration, cadence)
              ) 
              
              return alert('Inputs have to be positive numbers.');

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        if(type === 'cycling') {
            const elevation = +inputElevation.value;

            if
              (
                !validInputs(distance, duration, elevation) || 
                !allPositive(distance, duration)
              ) 
                
              return alert('Inputs have to be positive numbers.');

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        this.#workouts.push(workout);
        this.__clearFormInputs();
        this.__hideForm();
        this.__renderWorkoutMarker(workout);
        this.__renderWorkout(workout);
    }

    __renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
                workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

        if(workout.type === 'running') {
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
        </li>`
        }

        if(workout.type === 'cycling') {
            html += `          
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
                <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevation}</span>
                <span class="workout__unit">m</span>
            </div>
        </li>`
        }

        form.insertAdjacentHTML('afterend', html);
    }

    __renderWorkoutMarker(workout) {

        // Display Marker
        markers.push(L.marker(workout.coords).addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 150,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`
        })
      )
      .setPopupContent(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
        )
      .openPopup());
    }

    __clearFormInputs() {
        inputCadence.value = '';
        inputDistance.value = '';
        inputDuration.value = '';
        inputElevation.value = '';
    }

    __hideForm() {
        form.style.display = 'none';
        form.classList.add('hidden');
        
        setTimeout(() => {
            form.style.display = 'grid';
        }, 1000);
    }

    __moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if(!workoutEl) return;
        
        const workout = this.#workouts.find(
            work => work.id === workoutEl.dataset.id
        );

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }
}

// Initialize a new app.
const app = new App();

// function removePriorMarker(map, markers) {
//     map.removeLayer(markers[markers.length - 1]);
// }