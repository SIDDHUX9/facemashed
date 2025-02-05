// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC1Ma0F8xQVQOUxmHi374LPCO6pgsoFD74",
    authDomain: "facemashx9.firebaseapp.com",
    projectId: "facemashx9",
    storageBucket: "facemashx9.appspot.com",
    messagingSenderId: "429966268476",
    appId: "1:429966268476:web:deca9c835849a085a68b39",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize an empty array for cars
let cars = [];

// DOM elements
const carImage1 = document.getElementById("carImage1");
const carImage2 = document.getElementById("carImage2");
const carName1 = document.getElementById("carName1");
const carName2 = document.getElementById("carName2");
const voteButton1 = document.getElementById("vote1");
const voteButton2 = document.getElementById("vote2");
const message = document.getElementById("message");

let currentPair = [];

// Function to load cars data from the JSON file
async function loadCars() {
    try {
        const response = await fetch("cars.json"); // Path to your JSON file
        cars = await response.json();
        console.log("Cars loaded successfully:", cars);

        // Load initial pair of cars
        getRandomcars();

        // Load leaderboard
        updateLeaderboard();
    } catch (error) {
        console.error("Error loading cars data:", error);
    }
}

// Function to get two random cars
function getRandomcars() {
    if (cars.length < 2) {
        console.error("Not enough cars to compare.");
        return;
    }

    const randomIndex1 = Math.floor(Math.random() * cars.length);
    let randomIndex2 = Math.floor(Math.random() * cars.length);
    while (randomIndex2 === randomIndex1) {
        randomIndex2 = Math.floor(Math.random() * cars.length);
    }
    currentPair = [cars[randomIndex1], cars[randomIndex2]];

    // Update image sources and names
    carImage1.src = currentPair[0].image;
    carImage2.src = currentPair[1].image;
    carName1.textContent = currentPair[0].name;
    carName2.textContent = currentPair[1].name;

    // Add error handling for images
    carImage1.onerror = function () {
        this.src = "fallback.jpg"; // Fallback image if the original fails to load
        this.alt = "Failed to load image";
    };
    carImage2.onerror = function () {
        this.src = "fallback.jpg"; // Fallback image if the original fails to load
        this.alt = "Failed to load image";
    };
}

// Function to get the key for the current combination
function getCombinationKey(car1, car2) {
    return `voted_${Math.min(car1.id, car2.id)}_${Math.max(car1.id, car2.id)}`;
}

// Function to check if the user has already voted on the current combination
function hasUserVotedOnCombination(car1, car2) {
    const key = getCombinationKey(car1, car2);
    return localStorage.getItem(key) === "voted";
}

// Function to mark the current combination as voted
function markCombinationAsVoted(car1, car2) {
    const key = getCombinationKey(car1, car2);
    localStorage.setItem(key, "voted");
}

// Function to handle voting
async function vote(car) {
    // Check if the user has already voted on this combination
    if (hasUserVotedOnCombination(currentPair[0], currentPair[1])) {
        message.textContent = "You have already voted on this combination! Come back later, we are adding more combination soon";
        setTimeout(() => {
            message.textContent = "";
        }, 2000);
        return;
    }

    try {
        // Disable buttons
        voteButton1.disabled = true;
        voteButton2.disabled = true;

        // Update votes in Firestore
        const carRef = doc(db, "votes", car.id.toString());
        const docSnap = await getDoc(carRef);

        if (docSnap.exists()) {
            // If the document exists, increment the vote count
            await updateDoc(carRef, {
                votes: increment(1),
            });
        } else {
            // If the document doesn't exist, create it with an initial vote count of 1
            await setDoc(carRef, {
                id: car.id,
                votes: 1,
            });
        }

        // Mark the combination as voted
        markCombinationAsVoted(currentPair[0], currentPair[1]);

        // Show confirmation message
        message.textContent = `You voted for ${car.name}!`;
        setTimeout(() => {
            message.textContent = "";
            getRandomcars(); // Load a new pair of cars
            // Re-enable buttons
            voteButton1.disabled = false;
            voteButton2.disabled = false;
        }, 2000);

        // Update the leaderboard
        updateLeaderboard();
    } catch (error) {
        console.error("Error voting:", error);
        message.textContent = "Failed to vote. Please try again.";
        // Re-enable buttons in case of error
        voteButton1.disabled = false;
        voteButton2.disabled = false;
    }
}

// DOM elements for search
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

// Function to search for a car by name
async function searchCar() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        message.textContent = "Please enter a car name to search.";
        setTimeout(() => {
            message.textContent = "";
        }, 2000);
        return;
    }

    try {
        // Fetch all votes from Firestore
        const votesQuery = query(collection(db, "votes"));
        const votesSnapshot = await getDocs(votesQuery);

        let foundCar = null;
        votesSnapshot.forEach((doc) => {
            const car = cars.find(car => car.id.toString() === doc.id);
            if (car && car.name.toLowerCase().includes(searchTerm)) {
                foundCar = {
                    name: car.name,
                    votes: doc.data().votes,
                    image: car.image,
                };
            }
        });

        if (foundCar) {
            // Display the search result
            message.innerHTML = `
                <strong>${foundCar.name}</strong><br>
                Votes: ${foundCar.votes}<br>
                <img src="${foundCar.image}" alt="${foundCar.name}" style="width: 200px; margin-top: 10px;">
            `;
        } else {
            message.textContent = "No car found with that name.";
            setTimeout(() => {
                message.textContent = "";
            }, 2000);
        }
    } catch (error) {
        console.error("Error searching for car:", error);
        message.textContent = "Failed to search. Please try again.";
    }
}



// Event listener for the search button
searchButton.addEventListener("click", searchCar);

// Optional: Allow pressing "Enter" to trigger search
searchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        searchCar();
    }
});

// Function to update the leaderboard
async function updateLeaderboard() {
    const leaderboardList = document.getElementById("leaderboardList");
    const totalVotesElement = document.getElementById("totalVotes");
    leaderboardList.innerHTML = "<li>Loading leaderboard...</li>";

    try {
        const votesQuery = query(collection(db, "votes"), orderBy("votes", "desc"));
        const votesSnapshot = await getDocs(votesQuery);

        let totalVotes = 0;
        leaderboardList.innerHTML = "";
        votesSnapshot.forEach((doc) => {
            const votes = doc.data().votes;
            totalVotes += votes;
            const li = document.createElement("li");
            li.textContent = `${cars.find(car => car.id.toString() === doc.id)?.name || `Car ${doc.id}`}: ${votes} votes`;
            leaderboardList.appendChild(li);
        });

        // Update total votes
        totalVotesElement.textContent = totalVotes;
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        leaderboardList.innerHTML = "<li>Failed to load leaderboard. Please try again.</li>";
    }
}

// Event listeners for voting buttons
voteButton1.addEventListener("click", () => vote(currentPair[0]));
voteButton2.addEventListener("click", () => vote(currentPair[1]));

// Load cars data and initialize the app
loadCars();
