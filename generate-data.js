import { write } from "bun";

// --- Configuration ---
const YEAR = 2025;
const MIN_PROJECTS_PER_MONTH = 8;
const MAX_PROJECTS_PER_MONTH = 18;

// --- Helper Functions ---
const generateId = (length = 21) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomDateInMonth = (monthIndex) => {
  const date = new Date(YEAR, monthIndex, randomInt(1, 28));
  // Add random time
  date.setHours(randomInt(8, 18), randomInt(0, 59), randomInt(0, 59));
  return date;
};

// --- Data Pools ---
const CLIENT_NAMES = [
  "Nordic Café", "BluePeak Studio", "Gore Tex", "Horizon Architecture",
  "TechFlow Solutions", "Urban Garden Co.", "Apex Logistics", "Starlight Events",
  "Velocity Motors", "Creative Minds Agency", "EcoStruct Builders", "Redwood Legal",
  "Summit Financial", "Oceanic Shipping", "Quantum Labs"
];

const PROJECT_TYPES = [
  "Renovation", "Expansion", "Consulting Phase", "Q1 Logistics", "Annual Maintenance",
  "Server Upgrade", "Lobby Redesign", "Spring Campaign", "Security Audit", "Brand Overhaul"
];

const PRODUCTS = [
  { name: "Transport", minCost: 100, maxCost: 1500 },
  { name: "Main d'oeuvre", minCost: 500, maxCost: 5000 },
  { name: "Raw Materials", minCost: 200, maxCost: 3000 },
  { name: "Consulting Fee", minCost: 1000, maxCost: 4000 },
  { name: "Software License", minCost: 50, maxCost: 500 },
  { name: "Equipment Rental", minCost: 300, maxCost: 1200 },
  { name: "Permits & Fees", minCost: 100, maxCost: 400 }
];

// --- Generation Logic ---

console.log(`🚀 Generating data for Year ${YEAR}...`);

// 1. Generate Clients
const clients = CLIENT_NAMES.map(name => ({
  id: generateId(),
  name: name,
  image: null,
  createdAt: new Date(YEAR, 0, 1).toISOString(),
  updatedAt: new Date().toISOString()
}));

// 2. Generate Projects & Products
const projects = [];

// Loop through all 12 months
for (let month = 0; month < 12; month++) {
  const numProjects = randomInt(MIN_PROJECTS_PER_MONTH, MAX_PROJECTS_PER_MONTH);

  // Determine realistic status based on "Current Date" relative to simulation
  // Assuming we want a mix: Past = Completed, Current = Active, Future = Draft
  let baseStatus = "Completed";
  if (month === 11) baseStatus = "Draft"; // December is Draft
  if (month === 10) baseStatus = "Active"; // November is Active

  for (let i = 0; i < numProjects; i++) {
    const projectDate = randomDateInMonth(month);
    const client = clients[randomInt(0, clients.length - 1)];
    const type = PROJECT_TYPES[randomInt(0, PROJECT_TYPES.length - 1)];

    // Create Project
    const projectId = generateId();
    const projectTitle = `${client.name} - ${type}`;

    // Generate Products for this project
    const projectProducts = [];
    const numProducts = randomInt(2, 6);

    for (let p = 0; p < numProducts; p++) {
      const prodTemplate = PRODUCTS[randomInt(0, PRODUCTS.length - 1)];
      const cost = randomInt(prodTemplate.minCost, prodTemplate.maxCost);

      // Calculate Margin (15% to 45%)
      const marginPercent = randomInt(15, 45) / 100;
      const sellingPrice = Math.round(cost * (1 + marginPercent));

      projectProducts.push({
        id: generateId(),
        title: prodTemplate.name,
        costPrice: cost,
        sellingPrice: sellingPrice,
        date: projectDate.toISOString()
      });
    }

    projects.push({
      id: projectId,
      title: projectTitle,
      clientId: client.id,
      status: baseStatus,
      date: projectDate.toISOString(),
      createdAt: projectDate.toISOString(),
      updatedAt: projectDate.toISOString(),
      products: projectProducts,
      image: null
    });
  }
}

// 3. Assemble JSON
const db = {
  meta: {
    version: 1,
    exportedAt: new Date().toISOString()
  },
  clients: clients,
  projects: projects
};

// 4. Write File
await write("db.json", JSON.stringify(db, null, 2));

console.log(`✅ Successfully generated db.json`);
console.log(`📊 Clients: ${clients.length}`);
console.log(`asd Projects: ${projects.length}`);
console.log(`📅 Year Covered: ${YEAR}`);
