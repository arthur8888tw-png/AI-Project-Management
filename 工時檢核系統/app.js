// app.js

// State management
let state = {
    logs: [],
    filters: {
        startDate: '',
        endDate: '',
        project: 'all'
    }
};

// DOM Elements
const elements = {
    totalHours: document.getElementById('totalHours'),
    projectCount: document.getElementById('projectCount'),
    logCount: document.getElementById('logCount'),
    tableBody: document.getElementById('logTableBody'),
    projectFilter: document.getElementById('projectFilter'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    modal: document.getElementById('addLogModal'),
    addLogBtn: document.getElementById('addLogBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    logForm: document.getElementById('logForm'),
    projectChartCanvas: document.getElementById('projectChart'),
    dateChartCanvas: document.getElementById('dateChart')
};

// Charts
let projectChart = null;
let dateChart = null;

// Initialize
async function init() {
    await loadData();
    setupEventListeners();
    updateDashboard();
}

// Load Data
async function loadData() {
    try {
        const response = await fetch('./work_logs.json');
        if (!response.ok) throw new Error('Failed to load data');
        state.logs = await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to empty array or alert user
        state.logs = [];
    }
}

// Event Listeners
function setupEventListeners() {
    elements.projectFilter.addEventListener('change', (e) => {
        state.filters.project = e.target.value;
        updateDashboard();
    });

    elements.startDate.addEventListener('change', (e) => {
        state.filters.startDate = e.target.value;
        updateDashboard();
    });

    elements.endDate.addEventListener('change', (e) => {
        state.filters.endDate = e.target.value;
        updateDashboard();
    });

    elements.addLogBtn.addEventListener('click', () => {
        elements.modal.classList.add('active');
    });

    elements.closeModalBtn.addEventListener('click', () => {
        elements.modal.classList.remove('active');
    });

    // Close modal on outside click
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            elements.modal.classList.remove('active');
        }
    });

    elements.logForm.addEventListener('submit', handleFormSubmit);
}

// Form Validation
function validateForm(formData) {
    if (!formData.get('date').trim()) return false;
    if (!formData.get('project').trim()) return false; 
    if (!formData.get('engineer').trim()) return false;
    if (!formData.get('workItem').trim()) return false;
    const timeSpent = parseFloat(formData.get('timeSpent'));
    if (isNaN(timeSpent) || timeSpent <= 0) return false;
    return true;
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(elements.logForm);
    
    // Basic Validation
    if(!validateForm(formData)) {
        alert('Please fill out all fields correctly.');
        return;
    }

    const newLog = {
        id: Date.now().toString(),
        date: formData.get('date'),
        project: formData.get('project'),
        engineer: formData.get('engineer'),
        workItem: formData.get('workItem'),
        timeSpent: parseFloat(formData.get('timeSpent')),
        description: formData.get('description')
    };

    state.logs.push(newLog);
    
    // NOTE: In a real app with a backend, we would POST this data.
    // Here we just update local state and re-render.
    // For local file persistence without a server, we'd need Node.js file system access or similar.
    // For this browser-based demo, data is volatile (refreshes will reset).
    console.log('New Log Added:', newLog);
    alert('Log added! (Note: Changes are temporary in this static demo)');

    elements.modal.classList.remove('active');
    elements.logForm.reset();
    updateDashboard();
}

// Filter Data
function getFilteredLogs() {
    return state.logs.filter(log => {
        const matchesProject = state.filters.project === 'all' || log.project === state.filters.project;
        
        // Date filtering
        let matchesDate = true;
        if (state.filters.startDate) {
            matchesDate = matchesDate && log.date >= state.filters.startDate;
        }
        if (state.filters.endDate) {
            matchesDate = matchesDate && log.date <= state.filters.endDate;
        }

        return matchesProject && matchesDate;
    });
}

// Update Dashboard
function updateDashboard() {
    const filteredLogs = getFilteredLogs();
    
    // populate filter dropdown if needed (unique projects)
    const uniqueProjects = [...new Set(state.logs.map(l => l.project))];
    // Preserve "all" option
    const currentVal = elements.projectFilter.value;
    elements.projectFilter.innerHTML = '<option value="all">Check Project</option>'; // Reset
    uniqueProjects.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = p;
        elements.projectFilter.appendChild(option);
    });
    elements.projectFilter.value = currentVal;

    // Update Stats
    const totalHours = filteredLogs.reduce((acc, log) => acc + log.timeSpent, 0);
    const uniqueProjectsInFilter = new Set(filteredLogs.map(l => l.project)).size;
    
    elements.totalHours.textContent = totalHours.toFixed(1) + 'h';
    elements.projectCount.textContent = uniqueProjectsInFilter;
    elements.logCount.textContent = filteredLogs.length;

    // Update Table
    updateTable(filteredLogs);

    // Update Charts
    updateCharts(filteredLogs);
}

// Update Table
function updateTable(logs) {
    elements.tableBody.innerHTML = '';
    
    // Sort by date desc
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedLogs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.date}</td>
            <td><span class="tag tag-project">${log.project}</span></td>
            <td>${log.engineer}</td>
            <td>${log.workItem}</td>
            <td>${log.timeSpent}h</td>
            <td>${log.description}</td>
        `;
        elements.tableBody.appendChild(row);
    });
}

// Update Charts
function updateCharts(logs) {
    // Destroy existing
    if(projectChart) projectChart.destroy();
    if(dateChart) dateChart.destroy();

    // 1. Hours by Project
    const projectStats = {};
    logs.forEach(log => {
        projectStats[log.project] = (projectStats[log.project] || 0) + log.timeSpent;
    });

    const ctxProject = elements.projectChartCanvas.getContext('2d');
    projectChart = new Chart(ctxProject, {
        type: 'doughnut',
        data: {
            labels: Object.keys(projectStats),
            datasets: [{
                data: Object.values(projectStats),
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Hours Distribution by Project'
                }
            }
        }
    });

    // 2. Hours by Date
    const dateStats = {};
    // Sort dates
    const sortedDates = [...new Set(logs.map(l => l.date))].sort();
    sortedDates.forEach(date => {
        dateStats[date] = logs.filter(l => l.date === date).reduce((sum, l) => sum + l.timeSpent, 0);
    });

    const ctxDate = elements.dateChartCanvas.getContext('2d');
    dateChart = new Chart(ctxDate, {
        type: 'bar',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Daily Hours',
                data: sortedDates.map(d => dateStats[d]),
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Daily Work Hours'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Start
init();
