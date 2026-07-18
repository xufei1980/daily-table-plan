const SUPABASE_URL = "https://wsqmlicuohejvbtzarfq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KzW9Yu92o4f1IDGQ71699g_GmULl8eG";
const TABLE_NAME = "daily_plans";
const USERNAME_DOMAIN = "tableplan.local";
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TEACHERS = ["Fleur", "Jihee", "Nikita", "Ashi", "Felix"];
const ZONES = {
  inside: [
    "Art table",
    "Playdough table",
    "Tea table",
    "Welcome table",
  ],
  outside: [
    "Carpentry table",
    "Water trough",
    "Sandpit",
    "Corner table",
    "Climbing box area table",
    "Easel",
  ],
};

const dateInput = document.querySelector("#planDate");
const weekdayLabel = document.querySelector("#weekdayLabel");
const prevDayButton = document.querySelector("#prevDay");
const nextDayButton = document.querySelector("#nextDay");
const saveButton = document.querySelector("#savePlan");
const printButton = document.querySelector("#printPlan");
const clearButton = document.querySelector("#clearDay");
const duplicateButton = document.querySelector("#duplicateYesterday");
const statusText = document.querySelector("#saveStatus");
const zonePanel = document.querySelector("#zonePanel");
const tabButtons = document.querySelectorAll(".tab");
const activityTemplate = document.querySelector("#activityTemplate");
const authShell = document.querySelector("#authShell");
const appShell = document.querySelector("#appShell");
const loginForm = document.querySelector("#loginForm");
const loginName = document.querySelector("#loginName");
const loginPassword = document.querySelector("#loginPassword");
const loginStatus = document.querySelector("#loginStatus");
const signOutButton = document.querySelector("#signOutButton");
const currentUser = document.querySelector("#currentUser");
const printTitle = document.querySelector("#printTitle");
const printDate = document.querySelector("#printDate");

const supabaseClient = createSupabaseClient();
let activeZone = "inside";
let currentPlan = createEmptyPlan(todayKey());
let currentSession = null;

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !window.supabase) {
    return null;
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function addDays(dateKey, amount) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function weekdayName(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function clonePlan(plan) {
  return JSON.parse(JSON.stringify(plan));
}

function createEmptyZone(zone) {
  return {
    teachers: ["", ""],
    evaluation: "",
    activities: Object.fromEntries(
      ZONES[zone].map((name) => [name, { activity: "", photo: "" }]),
    ),
  };
}

function createEmptyPlan(dateKey) {
  return {
    date: dateKey,
    inside: createEmptyZone("inside"),
    outside: createEmptyZone("outside"),
  };
}

function normalizeTeachers(zoneData) {
  if (Array.isArray(zoneData.teachers)) {
    return [zoneData.teachers[0] || "", zoneData.teachers[1] || ""];
  }
  return [zoneData.teacher || "", ""];
}

function normalizePlan(plan, dateKey) {
  const next = plan || createEmptyPlan(dateKey);
  next.date = dateKey;
  ["inside", "outside"].forEach((zone) => {
    if (!next[zone]) next[zone] = createEmptyZone(zone);
    next[zone].teachers = normalizeTeachers(next[zone]);
    if (!next[zone].activities) next[zone].activities = {};
    ZONES[zone].forEach((name) => {
      if (!next[zone].activities[name]) {
        next[zone].activities[name] = { activity: "", photo: "" };
      }
    });
  });
  return next;
}

async function fetchPlan(dateKey) {
  if (!supabaseClient || !currentSession) return createEmptyPlan(dateKey);
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("plan")
    .eq("date", dateKey)
    .maybeSingle();

  if (error) throw error;
  return normalizePlan(data?.plan, dateKey);
}

async function savePlan(plan) {
  if (!supabaseClient) {
    throw new Error("Database is not connected. Add Supabase URL and publishable key in script.js.");
  }
  if (!currentSession) {
    throw new Error("Please log in before saving.");
  }
  const { error } = await supabaseClient.from(TABLE_NAME).upsert({
    date: plan.date,
    plan,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function deletePlan(dateKey) {
  if (!supabaseClient) {
    currentPlan = createEmptyPlan(dateKey);
    return;
  }
  if (!currentSession) {
    throw new Error("Please log in before clearing.");
  }
  const { error } = await supabaseClient.from(TABLE_NAME).delete().eq("date", dateKey);
  if (error) throw error;
}

function setStatus(message) {
  statusText.textContent = message;
}

function setLoginStatus(message) {
  loginStatus.textContent = message;
}

function loginIdentifier(value) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@${USERNAME_DOMAIN}`;
}

function showLogin(message = "") {
  appShell.classList.add("hidden");
  authShell.classList.remove("hidden");
  if (message) setLoginStatus(message);
}

function showApp(session) {
  currentSession = session;
  authShell.classList.add("hidden");
  appShell.classList.remove("hidden");
  currentUser.textContent = session?.user?.email || "Signed in";
}

async function initialiseAuth() {
  if (!supabaseClient) {
    showLogin("Database is not connected. Add Supabase URL and publishable key in script.js.");
    return;
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (session) {
        showApp(session);
        loadDate(dateInput.value || todayKey());
      } else {
        currentSession = null;
        showLogin("Please log in with your teacher account.");
      }
    }, 0);
  });

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    showLogin(`Session check failed: ${error.message}`);
    return;
  }
  if (data.session) {
    showApp(data.session);
    await loadDate(todayKey());
  } else {
    showLogin("Please log in with your teacher account.");
  }
}

function teacherOptions(selected) {
  const options = [`<option value="">Select teacher</option>`];
  TEACHERS.forEach((teacher) => {
    const isSelected = teacher === selected ? "selected" : "";
    options.push(`<option value="${teacher}" ${isSelected}>${teacher}</option>`);
  });
  return options.join("");
}

function renderZone() {
  const zoneData = currentPlan[activeZone];
  zonePanel.innerHTML = "";
  updatePrintHeading();

  const meta = document.createElement("section");
  meta.className = "zone-meta";
  meta.innerHTML = `
    <div class="teacher-pair" aria-label="${activeZone} teachers">
      <label class="field">
        <span>${activeZone} teacher 1</span>
        <select class="teacher-select" data-index="0">${teacherOptions(zoneData.teachers[0])}</select>
      </label>
      <label class="field">
        <span>${activeZone} teacher 2</span>
        <select class="teacher-select" data-index="1">${teacherOptions(zoneData.teachers[1])}</select>
      </label>
    </div>
    <label class="field">
      <span>${activeZone} evaluation</span>
      <textarea id="evaluationInput" rows="4" placeholder="Evaluation notes">${zoneData.evaluation}</textarea>
    </label>
  `;
  zonePanel.appendChild(meta);

  const grid = document.createElement("section");
  grid.className = "activity-grid";
  ZONES[activeZone].forEach((name) => {
    grid.appendChild(renderActivity(name, zoneData.activities[name]));
  });
  zonePanel.appendChild(grid);

  document.querySelectorAll(".teacher-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const index = Number(event.target.dataset.index);
      currentPlan[activeZone].teachers[index] = event.target.value;
      setStatus("Unsaved changes");
    });
  });
  document.querySelector("#evaluationInput").addEventListener("input", (event) => {
    currentPlan[activeZone].evaluation = event.target.value;
    setStatus("Unsaved changes");
  });
}

function renderActivity(name, value) {
  const node = activityTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector("h2").textContent = name;
  const textarea = node.querySelector("textarea");
  const fileInput = node.querySelector("input[type='file']");
  const preview = node.querySelector(".preview");
  const image = node.querySelector("img");
  const removeButton = node.querySelector(".remove-photo");

  textarea.value = value.activity;
  textarea.addEventListener("input", (event) => {
    currentPlan[activeZone].activities[name].activity = event.target.value;
    setStatus("Unsaved changes");
  });

  if (value.photo) {
    preview.classList.remove("hidden");
    image.src = value.photo;
    image.alt = `${name} activity photo`;
  }

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      currentPlan[activeZone].activities[name].photo = reader.result;
      setStatus("Photo added. Save when ready.");
      renderZone();
    });
    reader.readAsDataURL(file);
  });

  removeButton.addEventListener("click", () => {
    currentPlan[activeZone].activities[name].photo = "";
    setStatus("Photo removed. Save when ready.");
    renderZone();
  });

  return node;
}

function switchZone(zone) {
  activeZone = zone;
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.zone === zone);
  });
  renderZone();
}

function updatePrintHeading() {
  const label = activeZone === "inside" ? "Inside" : "Outside";
  printTitle.textContent = `${label} Plan`;
  printDate.textContent = dateInput.value;
}

async function loadDate(dateKey) {
  dateInput.value = dateKey;
  weekdayLabel.textContent = weekdayName(dateKey);
  setStatus("Loading...");
  try {
    currentPlan = await fetchPlan(dateKey);
    renderZone();
    setStatus(supabaseClient ? "Loaded from database" : "Database not connected");
  } catch (error) {
    currentPlan = createEmptyPlan(dateKey);
    renderZone();
    setStatus(`Load failed: ${error.message}`);
  }
}

async function clearCurrentDay() {
  setStatus("Clearing...");
  try {
    await deletePlan(dateInput.value);
    currentPlan = createEmptyPlan(dateInput.value);
    renderZone();
    setStatus("Day cleared");
  } catch (error) {
    setStatus(`Clear failed: ${error.message}`);
  }
}

async function duplicateYesterday() {
  const yesterday = addDays(dateInput.value, -1);
  setStatus("Loading yesterday...");
  try {
    const yesterdayPlan = await fetchPlan(yesterday);
    const isEmpty = JSON.stringify(yesterdayPlan) === JSON.stringify(createEmptyPlan(yesterday));
    if (isEmpty) {
      setStatus("No saved plan for yesterday");
      return;
    }
    currentPlan = normalizePlan(clonePlan(yesterdayPlan), dateInput.value);
    currentPlan.date = dateInput.value;
    renderZone();
    setStatus("Yesterday copied. Save when ready.");
  } catch (error) {
    setStatus(`Copy failed: ${error.message}`);
  }
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchZone(button.dataset.zone));
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    setLoginStatus("Database is not connected yet.");
    return;
  }
  setLoginStatus("Logging in...");
  const email = loginIdentifier(loginName.value);
  const password = loginPassword.value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setLoginStatus(`Login failed: ${error.message}`);
    return;
  }
  loginPassword.value = "";
  showApp(data.session);
  await loadDate(todayKey());
});

signOutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentPlan = createEmptyPlan(todayKey());
  showLogin("Signed out.");
});

dateInput.addEventListener("change", () => loadDate(dateInput.value));
prevDayButton.addEventListener("click", () => loadDate(addDays(dateInput.value, -1)));
nextDayButton.addEventListener("click", () => loadDate(addDays(dateInput.value, 1)));
printButton.addEventListener("click", () => {
  updatePrintHeading();
  window.print();
});
saveButton.addEventListener("click", async () => {
  setStatus("Saving...");
  try {
    await savePlan(currentPlan);
    setStatus("Saved to database");
  } catch (error) {
    setStatus(`Save failed: ${error.message}`);
  }
});
clearButton.addEventListener("click", clearCurrentDay);
duplicateButton.addEventListener("click", duplicateYesterday);

initialiseAuth();
