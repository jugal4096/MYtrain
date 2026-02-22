/* =========================
   Drawer Elements
========================= */
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const historyList = document.getElementById("history");

/* =========================
   Station Data (JSON Load)
========================= */
let stations = [];

fetch("railwayStationsList.json")
  .then(res => res.json())
  .then(data => {
    stations = data.stations;
    console.log("Stations Loaded:", stations.length);
  })
  .catch(err => console.error("Station Load Error:", err));

/* =========================
   Drawer Toggle
========================= */
function toggleDrawer() {
    drawer.classList.toggle("open");
    overlay.style.display = drawer.classList.contains("open") ? "block" : "none";
}

overlay.addEventListener("click", () => {
    drawer.classList.remove("open");
    overlay.style.display = "none";
});

/* =========================
   Swap Stations
========================= */
function swapStations() {
    const from = document.getElementById("from");
    const to = document.getElementById("to");

    let temp = from.value;
    from.value = to.value;
    to.value = temp;
}

/* =========================
   Autocomplete System
========================= */
function setupAutocomplete(inputId, listId) {
    const input = document.getElementById(inputId);
    const suggestionBox = document.getElementById(listId);

    input.addEventListener("input", function () {
        const value = this.value.toLowerCase();
        suggestionBox.innerHTML = "";

        if (!value || stations.length === 0) return;

        const filtered = stations.filter(st =>
            st.stnName.toLowerCase().includes(value) ||
            st.stnCode.toLowerCase().includes(value)
        ).slice(0, 8);

        filtered.forEach(st => {
            const div = document.createElement("div");
            div.classList.add("suggestion-item");
            div.textContent = `${st.stnName} (${st.stnCode})`;

            div.onclick = () => {
                document.querySelectorAll(".suggestion-item")
                    .forEach(i => i.classList.remove("selected"));

                div.classList.add("selected");
                input.value = `${st.stnName} (${st.stnCode})`;
                suggestionBox.innerHTML = "";
            };

            suggestionBox.appendChild(div);
        });
    });

    document.addEventListener("click", (e) => {
        if (e.target !== input) suggestionBox.innerHTML = "";
    });
}

setupAutocomplete("from", "from-list");
setupAutocomplete("to", "to-list");

/* =========================
   Recent Search Storage
========================= */
function saveRecent(searchText) {
    if (!searchText) return;

    let history = JSON.parse(localStorage.getItem("recentTrains")) || [];

    if (!history.includes(searchText)) {
        history.unshift(searchText);
        if (history.length > 6) history.pop();
    }

    localStorage.setItem("recentTrains", JSON.stringify(history));
    loadRecent();
}

function loadRecent() {
    historyList.innerHTML = "";

    let history = JSON.parse(localStorage.getItem("recentTrains")) || [];

    if (history.length === 0) {
        historyList.innerHTML = "<li>No recent searches</li>";
        return;
    }

    history.forEach((item, index) => {
        const li = document.createElement("li");

        li.innerHTML = `
          <span class="history-text" onclick="reuseSearch('${item}')">${item}</span>
          <span class="delete-history" onclick="deleteRecent(${index})">🗑</span>
        `;

        historyList.appendChild(li);
    });
}

/* Delete single history item */
function deleteRecent(index) {
    let history = JSON.parse(localStorage.getItem("recentTrains")) || [];
    history.splice(index, 1);
    localStorage.setItem("recentTrains", JSON.stringify(history));
    loadRecent();
}

/* Reuse search from history */
function reuseSearch(text) {
    const parts = text.split(" → ");
    if (parts.length !== 2) return;

    document.getElementById("from").value = parts[0];
    document.getElementById("to").value = parts[1];
}

/* =========================
   Clear Input
========================= */
function clearInput(id){
    document.getElementById(id).value = "";
}

/* =========================
   Extract Station Code
========================= */
function extractCode(text) {
    const match = text.match(/\((.*?)\)/);
    return match ? match[1] : null;
}

/* =========================
   Search Button Hook
========================= */
document.addEventListener("DOMContentLoaded", () => {
    loadRecent();

    const searchBtn = document.querySelector(".primary");

    searchBtn.addEventListener("click", () => {
        const fromText = document.getElementById("from").value;
        const toText = document.getElementById("to").value;

        if (!fromText || !toText) {
            alert("Please select both stations");
            return;
        }

        const fromCode = extractCode(fromText);
        const toCode = extractCode(toText);

        if (!fromCode || !toCode) {
            alert("Invalid station selection");
            return;
        }

        saveRecent(fromText + " → " + toText);

        window.location.href = `route.html?from=${fromCode}&to=${toCode}`;
    });
});