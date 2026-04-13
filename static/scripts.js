// Globals
let currentPatientId = null;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    fetchPatients();
});

// Toast notification
function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('hidden');
    setTimeout(() => { t.classList.add('hidden'); }, 3000);
}

// Data Fetching
async function fetchPatients(search = "") {
    const res = await fetch(`/api/patients/?search=${search}`);
    const data = await res.json();
    renderPatients(data);
}

function renderPatients(patients) {
    const tbody = document.getElementById('patientsTableBody');
    tbody.innerHTML = "";
    patients.forEach(p => {
        const tr = document.createElement('tr');
        tr.onclick = () => viewPatient(p.id);
        tr.innerHTML = `
            <td>#${p.id}</td>
            <td style="font-weight:600;">${p.name}</td>
            <td>${p.phone}</td>
            <td>${p.age || '-'}</td>
            <td>
                <button class="btn btn-outline btn-small" onclick="event.stopPropagation(); editPatientModal(${p.id})">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

let searchTimeout = null;
function handleSearch() {
    clearTimeout(searchTimeout);
    const val = document.getElementById('patientSearch').value;
    searchTimeout = setTimeout(() => {
        fetchPatients(val);
    }, 300);
}

// Patient View
async function viewPatient(id) {
    const res = await fetch(`/api/patients/${id}`);
    const patient = await res.json();
    currentPatientId = id;
    
    document.getElementById('patientListContainer').classList.add('hidden');
    const detailsContainer = document.getElementById('patientDetailsContainer');
    detailsContainer.classList.remove('hidden');
    
    let visitsHtml = patient.visits.length === 0 ? '<p>No visits recorded yet.</p>' : '';
    
    patient.visits.sort((a,b) => b.id - a.id).forEach(v => {
        let statusBadgeClass = v.order_status ? v.order_status.split(' ')[0] : 'Prescribed';
        visitsHtml += `
            <div class="visit-card">
                <div class="flex-between" style="margin-bottom: 1rem;">
                    <div>
                        <span style="font-weight: 600; color: var(--text-main);">Visit on ${v.date_of_visit}</span>
                        <span class="badge badge-${statusBadgeClass}" style="margin-left: 10px;">${v.order_status}</span>
                    </div>
                    <div>
                        <button class="btn btn-success btn-small" onclick="sendWhatsAppBill(${v.id})">🔗 WhatsApp Bill</button>
                    </div>
                </div>
                <div class="grid-3">
                    <div><span style="color:var(--text-muted);font-size:0.8rem;">Diagnosis</span><br>${v.diagnosis || '-'}</div>
                    <div><span style="color:var(--text-muted);font-size:0.8rem;">RE SPH</span><br>${v.right_sph || '-'}</div>
                    <div><span style="color:var(--text-muted);font-size:0.8rem;">LE SPH</span><br>${v.left_sph || '-'}</div>
                    <div><span style="color:var(--text-muted);font-size:0.8rem;">Balance Due</span><br>$${v.balance_due}</div>
                </div>
            </div>
        `;
    });

    detailsContainer.innerHTML = `
        <div class="flex-between">
            <button class="btn btn-outline" onclick="backToList()">← Back to List</button>
            <button class="btn btn-primary" onclick="openVisitModal(${id})">+ New Visit</button>
        </div>
        <div style="margin-top: 1.5rem; padding: 1.5rem; background: var(--bg-color); border-radius: var(--radius); margin-bottom: 2rem;">
            <h2 style="margin-top:0;">${patient.name}</h2>
            <p><strong>Phone:</strong> ${patient.phone} | <strong>Age:</strong> ${patient.age || '-'}</p>
        </div>
        <h3>Visit History</h3>
        ${visitsHtml}
    `;
}

function backToList() {
    document.getElementById('patientDetailsContainer').classList.add('hidden');
    document.getElementById('patientListContainer').classList.remove('hidden');
    fetchPatients();
}

// Patient Modal Logic
function openPatientModal() {
    document.getElementById('patientForm').reset();
    document.getElementById('patientId').value = "";
    document.getElementById('patientModalTitle').innerText = "Add New Patient";
    document.getElementById('patientModal').style.display = "flex";
}

async function editPatientModal(id) {
    const res = await fetch(`/api/patients/${id}`);
    const p = await res.json();
    document.getElementById('patientId').value = p.id;
    document.getElementById('patientName').value = p.name;
    document.getElementById('patientPhone').value = p.phone;
    document.getElementById('patientAge').value = p.age || '';
    document.getElementById('patientSecondaryPhone').value = p.secondary_contact || '';
    
    document.getElementById('patientModalTitle').innerText = "Edit Patient";
    document.getElementById('patientModal').style.display = "flex";
}

function closePatientModal() {
    document.getElementById('patientModal').style.display = "none";
}

async function submitPatient(e) {
    e.preventDefault();
    const id = document.getElementById('patientId').value;
    const data = {
        name: document.getElementById('patientName').value,
        phone: document.getElementById('patientPhone').value,
        age: document.getElementById('patientAge').value ? parseInt(document.getElementById('patientAge').value) : null,
        secondary_contact: document.getElementById('patientSecondaryPhone').value || null
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/patients/${id}` : `/api/patients/`;

    const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        closePatientModal();
        showToast(`Patient ${id ? 'updated' : 'added'} successfully.`);
        fetchPatients();
        if (id && currentPatientId == id) viewPatient(id);
    } else {
        const err = await res.json();
        alert("Error: " + JSON.stringify(err.detail));
    }
}

// Visit Modal Logic
function openVisitModal(patientId) {
    document.getElementById('visitForm').reset();
    document.getElementById('visitId').value = "";
    document.getElementById('visitPatientId').value = patientId;
    document.getElementById('visitModalTitle').innerText = "Add New Visit";
    document.getElementById('visitModal').style.display = "flex";
    calculateBalance();
}

function closeVisitModal() {
    document.getElementById('visitModal').style.display = "none";
}

function calculateBalance() {
    const total = parseFloat(document.getElementById('vTotalAmt').value) || 0;
    const advance = parseFloat(document.getElementById('vAdvance').value) || 0;
    document.getElementById('vBalance').value = (total - advance).toFixed(2);
}

async function submitVisit(e) {
    e.preventDefault();
    const pId = document.getElementById('visitPatientId').value;
    const data = {
        patient_id: parseInt(pId),
        complaints: document.getElementById('vComplaints').value || null,
        diagnosis: document.getElementById('vDiagnosis').value || null,
        
        right_sph: document.getElementById('vRSph').value || null,
        right_cyl: document.getElementById('vRCyl').value || null,
        right_axis: document.getElementById('vRAxis').value || null,
        right_add: document.getElementById('vRAdd').value || null,
        right_va: document.getElementById('vRVa').value || null,
        
        left_sph: document.getElementById('vLSph').value || null,
        left_cyl: document.getElementById('vLCyl').value || null,
        left_axis: document.getElementById('vLAxis').value || null,
        left_add: document.getElementById('vLAdd').value || null,
        left_va: document.getElementById('vLVa').value || null,
        
        total_pd: document.getElementById('vTotalPd').value || null,
        seg_height: document.getElementById('vSegHeight').value || null,
        
        total_amount: parseFloat(document.getElementById('vTotalAmt').value) || 0.0,
        advance_paid: parseFloat(document.getElementById('vAdvance').value) || 0.0,
        
        order_status: document.getElementById('vStatus').value || 'Prescribed',
        review_remark: document.getElementById('vReview').value || null
    };

    const res = await fetch(`/api/visits/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        closeVisitModal();
        showToast(`Visit logged successfully.`);
        viewPatient(pId);
    } else {
        const err = await res.json();
        alert("Error: " + JSON.stringify(err.detail));
    }
}

async function sendWhatsAppBill(visitId) {
    const res = await fetch(`/api/visits/${visitId}/whatsapp-bill`);
    if(res.ok) {
        const data = await res.json();
        window.open(data.url, '_blank');
    } else {
        alert("Failed to create WhatsApp Bill link.");
    }
}
