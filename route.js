/* ================= MENU ================= */
function toggleMenu(){
  const m = document.getElementById("menuBox");
  m.style.display = m.style.display === "block" ? "none" : "block";
}

/* ================= URL PARAMS ================= */
const params = new URLSearchParams(window.location.search);
const FROM = params.get("from") || "";
const TO = params.get("to") || "";

/* ================= SET TITLE ================= */
document.getElementById("routeTitle").innerText = `${FROM} → ${TO}`;

/* ================= GLOBAL DATA ================= */
let allTrains = [];
let currentTrains = [];
let selectedDate = new Date().toISOString().split("T")[0];
let currentSort = "early";
let currentFilter = "all";

/* ================= DATE BUTTONS ================= */
function setDate(offset, btn){
  document.querySelectorAll(".date-btn").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");

  const d = new Date();
  d.setDate(d.getDate()+offset);
  selectedDate = d.toISOString().split("T")[0];

  filterByDate();
}

function setCustomDate(input){
  if(!input.value) return;
  selectedDate = input.value;
  filterByDate();
}

/* ================= SHIMMER ================= */
function showLoading(){
  document.getElementById("results").innerHTML = `
    <div class="shimmer"></div>
    <div class="shimmer"></div>
    <div class="shimmer"></div>
  `;
}

/* ================= INITIAL LOAD ================= */
document.addEventListener("DOMContentLoaded", fetchAllTrains);

/* ================= FETCH TRAINS ================= */
async function fetchAllTrains(){
  if(!FROM || !TO){
    document.getElementById("results").innerHTML="Invalid stations";
    return;
  }

  showLoading();

  try{
    const res = await fetch(`http://localhost:3000/trains/betweenStations?from=${FROM}&to=${TO}`);
    const json = await res.json();

    if(!json.success || !json.data.length){
      document.getElementById("results").innerHTML="No trains found";
      return;
    }

    allTrains = json.data;
    filterByDate();

  }catch(err){
    document.getElementById("results").innerHTML="API error. Is server running?";
    console.error(err);
  }
}

/* ================= FILTER BY DATE ================= */
/* Dataset order = Mon Tue Wed Thu Fri Sat Sun */
function filterByDate(){
  if(!allTrains.length){
    document.getElementById("results").innerHTML="No trains available";
    return;
  }

  const jsDay = new Date(selectedDate).getDay(); // JS: Sun=0
  const dataIndex = jsDay === 0 ? 6 : jsDay - 1; // Convert to Mon-based index

  currentTrains = allTrains.map(t=>{
    const days = t.train_base?.running_days || "0000000";
    const runs = days[dataIndex] === "1";
    return { ...t, runsToday:runs };
  });

  applyFiltersAndSort();
}

/* ================= APPLY FILTER + SORT ================= */
function applyFiltersAndSort(){
  let list = [...currentTrains];

  /* ===== FILTER ===== */
  if(currentFilter !== "all"){
    list = list.filter(t=>{
      const name = (t.train_base?.train_name || "").toLowerCase();

      if(currentFilter==="available") return t.runsToday;

      if(currentFilter==="superfast"){
        return (
          name.includes("sf") ||
          name.includes("superfast") ||
          name.includes("raj") ||
          name.includes("shatabdi") ||
          name.includes("jan shatabdi") ||
          name.includes("sampark") ||
          name.includes("duronto") ||
          name.includes("tejas")
        );
      }

      if(currentFilter==="vande") return name.includes("vande");

      if(currentFilter==="passenger")
        return name.includes("pass") || name.includes("memu");

      if(currentFilter==="express")
        return name.includes("exp") && !name.includes("sf");

      return true;
    });
  }

  /* ===== SORT ===== */
  list.sort((a,b)=>{
    const ta = timeToMin(a.train_base?.from_time);
    const tb = timeToMin(b.train_base?.from_time);

    if(currentSort==="early") return ta - tb;
    if(currentSort==="late") return tb - ta;
    if(currentSort==="duration"){
      const da = timeToMin(a.train_base?.travel_time);
      const db = timeToMin(b.train_base?.travel_time);
      return da - db;
    }
    return 0;
  });

  displayTrains(list);
}

/* ================= DISPLAY TRAINS ================= */
function displayTrains(trains){
  const container = document.getElementById("results");

  container.innerHTML = trains.map(t=>{
    const b = t.train_base || {};
    const cardClass = t.runsToday ? "train-card running" : "train-card not-running";

    /* ===== CLEAN TRAIN NAME ===== */
    let trainName = b.train_name || "Train";

    trainName = trainName
      .replace(/\s+[A-Z]{1,3}\s*→\s*[A-Z]{1,4}$/i,"")
      .replace(/\bEXPRESS\b/gi,"Express")
      .replace(/\bEXP\b/gi,"Express")
      .replace(/\bSF\b/gi,"Superfast")
      .replace(/\bPASS\b/gi,"Passenger")
      .replace(/\bMEMU\b/gi,"MEMU")
      .replace(/\bRAJ\b/gi,"Rajdhani")
      .replace(/\bJAN SHATABDI\b/gi,"Jan Shatabdi")
      .replace(/\bSHATABDI\b/gi,"Shatabdi")
      .replace(/\bSAMPARK KRANTI\b/gi,"Sampark Kranti")
      .replace(/\bDURONTO\b/gi,"Duronto")
      .replace(/\bTEJAS\b/gi,"Tejas")
      .replace(/\bVANDE BHARAT\b/gi,"Vande Bharat");

    /* Remove accidental duplicate words */
    trainName = trainName.replace(/\b(\w+)\s+\1\b/gi,"$1");

    const dep = b.from_time || "--";
    const arr = b.to_time || "--";

    return `
      <div class="${cardClass}">
        <div class="train-name">${b.train_no} — ${trainName}</div>
        <div class="train-time">${b.from_stn_code || FROM} → ${b.to_stn_code || TO}</div>
        <div class="train-extra">Dep: ${dep} | Arr: ${arr}</div>
        <div class="running-days">${renderDays(b.running_days)}</div>
        <div class="train-extra">
          ${t.runsToday
            ? "<span style='color:#4caf50'>Running on selected day</span>"
            : "<span style='color:#9e9e9e'>Not running on selected day</span>"}
        </div>
      </div>
    `;
  }).join("");
}

/* ================= RENDER DAYS ================= */
/* Dataset order = Mon Tue Wed Thu Fri Sat Sun */
function renderDays(days){
  if(!days) return "";
  const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  return labels.map((d,i)=>{
    const active = days[i]==="1" ? "day-badge active":"day-badge";
    return `<span class="${active}">${d}</span>`;
  }).join("");
}

/* ================= TIME CONVERTER ================= */
function timeToMin(t){
  if(!t) return 9999;
  const p=t.split(".");
  if(p.length!==2) return 9999;
  return parseInt(p[0])*60 + parseInt(p[1]);
}

/* ================= SORT CHANGE ================= */
function changeSort(value){
  currentSort = value;
  applyFiltersAndSort();
}

/* ================= FILTER CHANGE ================= */
function changeFilter(value){
  currentFilter = value;
  applyFiltersAndSort();
}

/* ================= BACK BUTTON ================= */
function goBack(){
  if(document.referrer && document.referrer.includes("dashboard.html")){
    window.history.back();
  } else {
    window.location.href="dashboard.html";
  }
}