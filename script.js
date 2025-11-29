// ---------- DATA ----------

const buildings = [
  { id: "B1", name: "อาคารเรียน ป.1–3" },
  { id: "B2", name: "อาคารเรียน ป.4–6" },
  { id: "B3", name: "อาคารสำนักงาน" },
  { id: "B4", name: "ห้องสมุดโรงเรียน" },
  { id: "B5", name: "โรงอาหาร" },
  { id: "B6", name: "หอประชุม / โรงยิม" },
  { id: "B7", name: "ห้องคอมพิวเตอร์" },
  { id: "B8", name: "สนามกีฬา" }
];

const randomDescriptions = [
  "พื้นกระเบื้องแตก เสี่ยงนักเรียนล้ม",
  "หลอดไฟเสีย ห้องมืด",
  "ปลั๊กไฟชำรุด เสี่ยงไฟฟ้าลัดวงจร",
  "ประตูห้องเรียนปิดไม่สนิท",
  "หลังคารั่วเมื่อฝนตก",
  "น้ำไม่ไหลในห้องน้ำ",
  "ท่อระบายน้ำอุดตัน",
  "ป้ายทางหนีไฟไม่ทำงาน",
  "เก้าอี้นักเรียนหักหลายตัว"
];

const severityConfig = {
  Low: {
    label: "ต่ำ",
    riskPerHour: 0.2,
    baseCost: [500, 1500],
    baseHours: [1, 2]
  },
  Medium: {
    label: "ปานกลาง",
    riskPerHour: 0.5,
    baseCost: [1500, 4000],
    baseHours: [2, 4]
  },
  High: {
    label: "สูง",
    riskPerHour: 1.0,
    baseCost: [4000, 9000],
    baseHours: [3, 5]
  },
  Critical: {
    label: "วิกฤต",
    riskPerHour: 2.0,
    baseCost: [9000, 18000],
    baseHours: [2, 6]
  }
};

// ทีมช่างจำลอง
let teams = [
  { id: 1, name: "ทีมช่าง A", status: "Idle", incidentId: null, remainingHours: 0 },
  { id: 2, name: "ทีมช่าง B", status: "Idle", incidentId: null, remainingHours: 0 },
  { id: 3, name: "ทีมช่าง C", status: "Idle", incidentId: null, remainingHours: 0 }
];

// ---------- GAME STATE ----------

let incidents = [];
let incidentIdCounter = 1;

const gameState = {
  day: 1,
  hour: 8,
  budget: 100000,
  score: 0,
  risk: 0
};

// ---------- UTIL ----------

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chooseRandom(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function formatTime() {
  const h = gameState.hour.toString().padStart(2, "0");
  return `วัน ${gameState.day} – ${h}:00`;
}

function formatMoney(value) {
  return "฿ " + value.toLocaleString("th-TH");
}

// ---------- LOG ----------

function addLog(message) {
  const logBox = document.getElementById("log");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const timeSpan = document.createElement("span");
  timeSpan.className = "log-time";
  timeSpan.textContent = `[${formatTime()}] `;
  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  entry.appendChild(timeSpan);
  entry.appendChild(msgSpan);
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

// ---------- INCIDENTS ----------

function createRandomIncident() {
  const building = chooseRandom(buildings);

  // random severity weighted
  const roll = Math.random();
  let sev = "Medium";
  if (roll < 0.2) sev = "Low";
  else if (roll < 0.6) sev = "Medium";
  else if (roll < 0.9) sev = "High";
  else sev = "Critical";

  const config = severityConfig[sev];
  const cost = randInt(config.baseCost[0], config.baseCost[1]);
  const hours = randInt(config.baseHours[0], config.baseHours[1]);

  const incident = {
    id: incidentIdCounter++,
    buildingId: building.id,
    buildingName: building.name,
    description: chooseRandom(randomDescriptions),
    severity: sev,
    status: "Open", // Open | In Progress | Done
    estimatedCost: cost,
    estimatedHours: hours,
    assignedTeamId: null,
    createdDay: gameState.day,
    createdHour: gameState.hour,
    totalHoursOpen: 0
  };

  incidents.push(incident);
  addLog(`มีงานแจ้งซ่อมใหม่ที่ ${incident.buildingName}: ${incident.description} (ระดับ ${severityConfig[sev].label})`);
  renderAll();
}

function addManualIncident(e) {
  e.preventDefault();

  const buildingId = document.getElementById("manualBuilding").value;
  const building = buildings.find(b => b.id === buildingId);
  const desc = document.getElementById("manualDesc").value.trim();
  const severity = document.getElementById("manualSeverity").value;
  const cost = parseInt(document.getElementById("manualCost").value, 10);
  const hours = parseInt(document.getElementById("manualHours").value, 10);

  if (!building || !desc) return;

  const incident = {
    id: incidentIdCounter++,
    buildingId,
    buildingName: building.name,
    description: desc,
    severity,
    status: "Open",
    estimatedCost: isNaN(cost) ? 2000 : cost,
    estimatedHours: isNaN(hours) ? 3 : hours,
    assignedTeamId: null,
    createdDay: gameState.day,
    createdHour: gameState.hour,
    totalHoursOpen: 0
  };

  incidents.push(incident);
  addLog(`สร้างงานแจ้งซ่อมใหม่: ${incident.description} @ ${incident.buildingName}`);
  document.getElementById("manualForm").reset();
  renderAll();
}

// ---------- TIME / SIMULATION ----------

function advanceTime(hours) {
  for (let i = 0; i < hours; i++) {
    gameState.hour++;
    if (gameState.hour >= 24) {
      gameState.hour = 0;
      gameState.day++;
    }

    // update incidents open time + risk
    updateIncidentsPerHour();

    // update teams working
    updateTeamsPerHour();

    // chance of random incident each hour (สูงขึ้นช่วง 8:00–16:00)
    const isSchoolHours = gameState.hour >= 8 && gameState.hour <= 16;
    const baseChance = isSchoolHours ? 0.18 : 0.06;
    if (Math.random() < baseChance) {
      createRandomIncident();
    }
  }

  renderAll();
}

function updateIncidentsPerHour() {
  incidents.forEach(inc => {
    if (inc.status === "Done") return;
    inc.totalHoursOpen += 1;
    const config = severityConfig[inc.severity];
    let riskGain = config.riskPerHour;
    // ถ้าเปิดนานเกิน 12 ชม. ได้ risk เพิ่มขึ้น
    if (inc.totalHoursOpen > 12) {
      riskGain *= 1.5;
    }
    if (inc.totalHoursOpen > 24 && inc.severity !== "Low") {
      riskGain *= 1.5;
      gameState.score -= 1; // ปล่อยค้างนาน หักคะแนน
    }
    gameState.risk += riskGain;
  });
}

function updateTeamsPerHour() {
  teams.forEach(team => {
    if (team.status === "Working" && team.incidentId != null) {
      team.remainingHours -= 1;
      if (team.remainingHours <= 0) {
        finishIncident(team);
      }
    }
  });
}

function finishIncident(team) {
  const incident = incidents.find(inc => inc.id === team.incidentId);
  if (!incident) {
    team.status = "Idle";
    team.incidentId = null;
    team.remainingHours = 0;
    return;
  }

  // ตัดงบ
  if (incident.estimatedCost > gameState.budget) {
    addLog(`งบประมาณไม่พอสำหรับงานที่ ${incident.buildingName} (${incident.description}) งานถูกเลื่อน`);
    // ทำให้กลับเป็น Open
    incident.status = "Open";
    incident.assignedTeamId = null;
    team.status = "Idle";
    team.incidentId = null;
    team.remainingHours = 0;
    gameState.score -= 1;
    return;
  }

  gameState.budget -= incident.estimatedCost;
  incident.status = "Done";
  incident.assignedTeamId = team.id;
  team.status = "Idle";
  team.incidentId = null;
  team.remainingHours = 0;

  // คำนวณคะแนน
  let baseScore = 0;
  if (incident.severity === "Critical") baseScore = 8;
  else if (incident.severity === "High") baseScore = 5;
  else if (incident.severity === "Medium") baseScore = 3;
  else baseScore = 1;

  // เสร็จภายใน 8 ชม. = bonus
  if (incident.totalHoursOpen <= 8) baseScore += 2;
  // severity สูงแต่เปิดนานมาก = minus
  if (incident.totalHoursOpen > 24 && (incident.severity === "High" || incident.severity === "Critical")) {
    baseScore -= 2;
  }

  gameState.score += baseScore;

  addLog(`ซ่อมเสร็จ: ${incident.description} @ ${incident.buildingName} (คะแนน +${baseScore})`);
}

// ---------- TEAMS / ASSIGN ----------

let modalIncidentId = null;

function openAssignModal(incidentId) {
  const incident = incidents.find(inc => inc.id === incidentId);
  if (!incident) return;

  modalIncidentId = incidentId;

  document.getElementById("modalIncidentTitle").textContent = incident.description;
  document.getElementById("modalIncidentMeta").textContent =
    `${incident.buildingName} · ระดับ ${severityConfig[incident.severity].label} · ใช้เวลา ${incident.estimatedHours} ชม. · ค่าใช้จ่าย ${formatMoney(incident.estimatedCost)}`;

  const list = document.getElementById("modalTeamList");
  list.innerHTML = "";

  teams.forEach(team => {
    const row = document.createElement("div");
    row.className = "modal-team-row";

    const info = document.createElement("div");
    info.innerHTML = `<strong>${team.name}</strong><br><span class="team-status">${team.status === "Idle" ? "ว่าง" : "กำลังทำงาน"}</span>`;

    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    if (team.status !== "Idle") {
      btn.disabled = true;
      btn.textContent = "ไม่ว่าง";
    } else {
      btn.textContent = "มอบหมายให้ทีมนี้";
      btn.addEventListener("click", () => assignTeamToIncident(team.id, incidentId));
    }

    row.appendChild(info);
    row.appendChild(btn);
    list.appendChild(row);
  });

  document.getElementById("modal").classList.remove("hidden");
}

function closeAssignModal() {
  document.getElementById("modal").classList.add("hidden");
  modalIncidentId = null;
}

function assignTeamToIncident(teamId, incidentId) {
  const team = teams.find(t => t.id === teamId);
  const incident = incidents.find(inc => inc.id === incidentId);
  if (!team || !incident) return;
  if (team.status !== "Idle") return;

  team.status = "Working";
  team.incidentId = incident.id;
  team.remainingHours = incident.estimatedHours;

  incident.status = "In Progress";
  incident.assignedTeamId = team.id;

  addLog(`มอบหมาย ${team.name} ให้ซ่อม: ${incident.description} @ ${incident.buildingName}`);
  closeAssignModal();
  renderAll();
}

// ---------- RENDER ----------

function renderBuildings() {
  const grid = document.getElementById("buildingGrid");
  grid.innerHTML = "";

  buildings.forEach(b => {
    const card = document.createElement("div");
    card.className = "building-card";
    card.dataset.id = b.id;

    const name = document.createElement("div");
    name.className = "building-name";
    name.textContent = b.name;

    const openCount = incidents.filter(inc =>
      inc.buildingId === b.id && inc.status !== "Done"
    ).length;

    card.appendChild(name);

    if (openCount > 0) {
      const badge = document.createElement("div");
      badge.className = "building-count";
      badge.textContent = `${openCount} งาน`;
      card.appendChild(badge);
    }

    card.addEventListener("click", () => {
      const filtered = incidents.filter(inc => inc.buildingId === b.id);
      renderIncidentList(filtered);
    });

    grid.appendChild(card);
  });
}

function renderIncidents(list = null) {
  const container = document.getElementById("incidentList");
  container.innerHTML = "";

  const data = list || incidents.slice();

  if (data.length === 0) {
    const p = document.createElement("p");
    p.className = "subtitle";
    p.textContent = "ยังไม่มีงานแจ้งซ่อมในระบบ";
    container.appendChild(p);
    return;
  }

  // sort: Open > In Progress > Done, then severity
  const sevOrder = { Critical: 3, High: 2, Medium: 1, Low: 0 };
  data.sort((a, b) => {
    const statusOrder = { Open: 2, "In Progress": 1, Done: 0 };
    if (statusOrder[b.status] !== statusOrder[a.status]) {
      return statusOrder[b.status] - statusOrder[a.status];
    }
    if (sevOrder[b.severity] !== sevOrder[a.severity]) {
      return sevOrder[b.severity] - sevOrder[a.severity];
    }
    return b.id - a.id;
  });

  data.forEach(inc => {
    const card = document.createElement("div");
    card.className = "incident-card";

    const header = document.createElement("div");
    header.className = "incident-header";

    const title = document.createElement("div");
    title.className = "incident-title";
    title.textContent = inc.description;

    const sevTag = document.createElement("span");
    const sevCls =
      inc.severity === "Low"
        ? "tag-sev-low"
        : inc.severity === "Medium"
        ? "tag-sev-medium"
        : inc.severity === "High"
        ? "tag-sev-high"
        : "tag-sev-critical";
    sevTag.className = `tag ${sevCls}`;
    sevTag.innerHTML = `<span class="tag-dot"></span><span>${severityConfig[inc.severity].label}</span>`;

    header.appendChild(title);
    header.appendChild(sevTag);

    const meta = document.createElement("div");
    meta.className = "incident-meta";
    meta.innerHTML = `
      <span>${inc.buildingName}</span>
      <span>• ใช้เวลา ${inc.estimatedHours} ชม.</span>
      <span>• ค่าใช้จ่าย ${formatMoney(inc.estimatedCost)}</span>
      <span>• เปิดมาแล้ว ${inc.totalHoursOpen} ชม.</span>
    `;

    const footer = document.createElement("div");
    footer.className = "incident-footer";

    const statusTag = document.createElement("span");
    statusTag.className = "tag";
    statusTag.textContent =
      inc.status === "Open"
        ? "ยังไม่มอบหมายทีม"
        : inc.status === "In Progress"
        ? "กำลังดำเนินการ"
        : "เสร็จสิ้น";

    const action = document.createElement("div");
    if (inc.status !== "Done") {
      const btn = document.createElement("button");
      btn.className = "btn btn-secondary";
      btn.textContent = inc.status === "Open" ? "มอบหมายทีมซ่อม" : "ดูความคืบหน้า";
      btn.addEventListener("click", () => openAssignModal(inc.id));
      action.appendChild(btn);
    } else {
      const label = document.createElement("span");
      label.style.color = "#4ade80";
      label.style.fontSize = "0.75rem";
      label.textContent = "ซ่อมเสร็จแล้ว";
      action.appendChild(label);
    }

    footer.appendChild(statusTag);
    footer.appendChild(action);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(footer);

    container.appendChild(card);
  });
}

function renderTeams() {
  const container = document.getElementById("teamList");
  container.innerHTML = "";

  teams.forEach(team => {
    const row = document.createElement("div");
    row.className = "team-row";

    const left = document.createElement("div");
    left.textContent = team.name;

    const right = document.createElement("div");
    right.className = "team-status";

    if (team.status === "Idle") {
      right.textContent = "ว่าง";
      right.style.color = "#a7f3d0";
    } else {
      const inc = incidents.find(i => i.id === team.incidentId);
      const remaining = team.remainingHours;
      right.textContent = inc
        ? `ซ่อม: ${inc.buildingName} (${remaining} ชม.ที่เหลือ)`
        : "กำลังดำเนินการ";
      right.style.color = "#fbbf24";
    }

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  });
}

function renderStats() {
  document.getElementById("simTime").textContent = formatTime();
  document.getElementById("budget").textContent = formatMoney(gameState.budget);
  document.getElementById("score").textContent = gameState.score;
  document.getElementById("risk").textContent = gameState.risk.toFixed(1);
  const openCount = incidents.filter(inc => inc.status !== "Done").length;
  document.getElementById("openCount").textContent = openCount.toString();
}

// รวมการ render ทั้งหมด

function renderAll() {
  renderBuildings();
  renderIncidents();
  renderTeams();
  renderStats();
}

// ---------- INIT ----------

function init() {
  // dropdown manual building
  const sel = document.getElementById("manualBuilding");
  buildings.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    sel.appendChild(opt);
  });

  // buttons
  document.getElementById("btnNewIncident").addEventListener("click", createRandomIncident);
  document.getElementById("btnAdvanceHour").addEventListener("click", () => advanceTime(1));
  document.getElementById("btnAdvanceDay").addEventListener("click", () => advanceTime(24));
  document.getElementById("manualForm").addEventListener("submit", addManualIncident);

  // modal buttons
  document.getElementById("btnCloseModal").addEventListener("click", closeAssignModal);
  document.querySelector(".modal-backdrop").addEventListener("click", closeAssignModal);

  // เริ่มต้นด้วยงานสุ่ม 2 งาน
  createRandomIncident();
  createRandomIncident();

  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
