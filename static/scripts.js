// Globals
let currentPatientId = null;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    fetchPatients();
    attachValidationListeners();
});

// Toast emulation function for silent completion (user requested no alerts, we removed toast from HTML, so we will silently succeed or just log)
function showToast(msg) {
    console.log(msg);
}

// Data Fetching
async function fetchPatients(search = "", date = "") {
    const res = await fetch(`/api/patients/?search=${search}&visit_date=${date}`);
    const data = await res.json();
    renderPatients(data);
}

function renderPatients(patients) {
    const container = document.getElementById('patientsCardContainer');
    container.innerHTML = "";
    
    if (patients.length === 0) {
        container.innerHTML = "<p style='color:var(--text-muted);'>No patients found.</p>";
        return;
    }

    patients.forEach(p => {
        let lastVisit = "Never";
        if (p.visits && p.visits.length > 0) {
            // Sort to find latest
            const dates = p.visits.map(v => new Date(v.date_of_visit));
            const latest = new Date(Math.max.apply(null, dates));
            lastVisit = latest.toLocaleDateString();
        }

        const div = document.createElement('div');
        div.className = 'patient-card';
        div.onclick = () => viewPatient(p.id);
        div.innerHTML = `
            <div class="patient-info">
                <div class="name">${p.name}</div>
                <div class="meta">ID: #${p.id}</div>
            </div>
            <div class="patient-stat">
                <span class="label">Phone</span>
                <span class="value">${p.phone}</span>
            </div>
            <div class="patient-stat">
                <span class="label">Age</span>
                <span class="value">${p.age || '-'}</span>
            </div>
            <div class="patient-stat">
                <span class="label">Last Visit</span>
                <span class="value">${lastVisit}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

let searchTimeout = null;
function handleSearch() {
    clearTimeout(searchTimeout);
    const val = document.getElementById('patientSearch').value;
    const dateVal = document.getElementById('visitDateSearch')?.value || "";
    searchTimeout = setTimeout(() => {
        fetchPatients(val, dateVal);
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
    
    let visitsHtml = patient.visits.length === 0 ? '<p style="color:var(--text-muted)">No clinical visits recorded yet.</p>' : '';
    
    patient.visits.sort((a,b) => b.id - a.id).forEach(v => {
        let statusBadgeClass = v.order_status ? v.order_status.split(' ')[0] : 'Prescribed';
        
        visitsHtml += `
            <div class="visit-card" style="margin-top: 1rem;">
                <div class="flex-between" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin: 0; color: var(--primary);">Visit record: ${v.date_of_visit}</h3>
                        <span class="badge badge-${statusBadgeClass}" style="margin-top: 0.5rem; display: inline-block;">${v.order_status}</span>
                    </div>
                    <div>
                        <button class="btn btn-whatsapp" onclick="sendWhatsAppBill(${v.id})" title="Share Bill Details">
                            <svg xmlns="http://www.svgrepo.com/show/33054/whatsapp.svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.25rem;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            WhatsApp Bill
                        </button>
                    </div>
                </div>
                <div class="grid-4" style="gap: 1.5rem;">
                    <div><span class="label" style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Diagnosis</span><br><span style="font-weight:500;">${v.diagnosis || '-'}</span></div>
                    <div><span class="label" style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;">OD SPH (Right)</span><br><span style="font-weight:500;">${v.right_sph || '-'}</span></div>
                    <div><span class="label" style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;">OS SPH (Left)</span><br><span style="font-weight:500;">${v.left_sph || '-'}</span></div>
                    <div><span class="label" style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Balance Due</span><br><span style="font-weight:700;color:var(--danger);font-size:1.1rem;">$${v.balance_due.toFixed(2)}</span></div>
                </div>
            </div>
        `;
    });

    detailsContainer.innerHTML = `
        <div class="flex-between section-header">
            <h2 style="margin:0; font-size:1.5rem;">Patient File: ${patient.name}</h2>
            <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-outline" onclick="backToList()">Close File</button>
                <button class="btn btn-primary" onclick="editPatientModal(${id})">Edit Details</button>
                <button class="btn btn-primary" onclick="openVisitModal(${id})">+ New Visit</button>
                <button class="btn" style="background-color: var(--danger); color: white;" onclick="deletePatient(${id})">Delete</button>
            </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
            <div><span style="color:var(--text-muted); font-size:0.85rem">Contact Number</span><br><span style="font-weight:500;">${patient.phone}</span></div>
            <div><span style="color:var(--text-muted); font-size:0.85rem">Age</span><br><span style="font-weight:500;">${patient.age || '-'}</span></div>
        </div>
        
        <h3 style="color:var(--secondary); text-transform:uppercase; font-size:0.9rem; letter-spacing:0.05em; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Clinical History</h3>
        ${visitsHtml}
    `;
}

function backToList() {
    document.getElementById('patientDetailsContainer').classList.add('hidden');
    document.getElementById('patientListContainer').classList.remove('hidden');
    fetchPatients();
}

// ----------------------------------------------------------------------
// Advanced Validation Engine
// ----------------------------------------------------------------------
const V_MODELS = {
    patientName: { min: 2, required: true },
    patientPhone: { regex: /^\d{10}$/, required: true },
    patientAge: { minNum: 1, maxNum: 120, required: false },
    patientSecondaryPhone: { regex: /^\d{10}$/, required: false },
    vTotalAmt: { minNum: 0.01, required: true },
    vAdvance: { minNum: 0, required: true } // Advanced validation handled cross-field
};

function attachValidationListeners() {
    // Attach blur and input to all validated fields
    Object.keys(V_MODELS).forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('blur', () => validateField(id));
        el.addEventListener('input', () => validateField(id));
    });

    // Cross-field triggers
    document.getElementById('vTotalAmt').addEventListener('input', () => { calculateBalance(); validateField('vAdvance'); });
    document.getElementById('vAdvance').addEventListener('input', () => { calculateBalance(); validateField('vAdvance'); });
}

function validateField(id) {
    const el = document.getElementById(id);
    const err = document.getElementById(id + "Err");
    const val = el.value.trim();
    const rules = V_MODELS[id];
    let isValid = true;

    if (val === "") {
        if(rules.required) isValid = false;
        else {
            setVisualState(el, err, true, val);
            return true;
        }
    } else {
        if (rules.min && val.length < rules.min) isValid = false;
        if (rules.regex && !rules.regex.test(val)) isValid = false;
        if (rules.minNum !== undefined && parseFloat(val) < rules.minNum) isValid = false;
        if (rules.maxNum !== undefined && parseFloat(val) > rules.maxNum) isValid = false;
        
        // Custom cross-field validation for Advance
        if (id === 'vAdvance') {
            const totalVal = parseFloat(document.getElementById('vTotalAmt').value) || 0;
            const advVal = parseFloat(val);
            if (advVal < 0 || advVal > totalVal) isValid = false;
        }
    }

    setVisualState(el, err, isValid, val);
    evaluateFormGlobalState(el.closest('form').id);
    return isValid;
}

function setVisualState(el, err, isValid, value) {
    if (isValid) {
        el.classList.remove('is-invalid');
        if(value !== "") el.classList.add('is-valid');
        else el.classList.remove('is-valid'); // Empty but optional
        if(err) err.classList.remove('active');
    } else {
        el.classList.remove('is-valid');
        el.classList.add('is-invalid');
        if(err) err.classList.add('active');
    }
}

function evaluateFormGlobalState(formId) {
    const form = document.getElementById(formId);
    if(!form) return;
    
    let isFormValid = true;
    
    if(formId === 'patientForm') {
        ['patientName', 'patientPhone', 'patientAge', 'patientSecondaryPhone'].forEach(f => {
            if(!validateFieldSilently(f)) isFormValid = false;
        });
        document.getElementById('btnPatientSubmit').disabled = !isFormValid;
    }
    
    if(formId === 'visitForm') {
        ['vTotalAmt', 'vAdvance'].forEach(f => {
            if(!validateFieldSilently(f)) isFormValid = false;
        });
        document.getElementById('btnVisitSubmit').disabled = !isFormValid;
    }
}

function validateFieldSilently(id) {
    const el = document.getElementById(id);
    const val = el.value.trim();
    const rules = V_MODELS[id];
    if (val === "" && !rules.required) return true;
    if (val === "" && rules.required) return false;
    if (rules.min && val.length < rules.min) return false;
    if (rules.regex && !rules.regex.test(val)) return false;
    if (rules.minNum !== undefined && parseFloat(val) < rules.minNum) return false;
    if (rules.maxNum !== undefined && parseFloat(val) > rules.maxNum) return false;
    if (id === 'vAdvance') {
        const totalVal = parseFloat(document.getElementById('vTotalAmt').value) || 0;
        const advVal = parseFloat(val);
        if (advVal < 0 || advVal > totalVal) return false;
    }
    return true;
}

function clearValidationState(formId) {
    const form = document.getElementById(formId);
    form.querySelectorAll('.form-control').forEach(el => {
        el.classList.remove('is-invalid', 'is-valid');
    });
    form.querySelectorAll('.error-msg').forEach(err => err.classList.remove('active'));
    
    if(formId === 'patientForm') document.getElementById('btnPatientSubmit').disabled = true;
    if(formId === 'visitForm') document.getElementById('btnVisitSubmit').disabled = true;
}

// ----------------------------------------------------------------------
// Patient Modal Logic
// ----------------------------------------------------------------------
function openPatientModal() {
    const form = document.getElementById('patientForm');
    form.reset();
    document.getElementById('patientId').value = "";
    document.getElementById('patientModalTitle').innerText = "Register New Patient";
    clearValidationState('patientForm');
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
    
    document.getElementById('patientModalTitle').innerText = "Update Patient Record";
    clearValidationState('patientForm');
    document.getElementById('patientModal').style.display = "flex";
    
    // Auto validate after mapping
    ['patientName', 'patientPhone', 'patientAge', 'patientSecondaryPhone'].forEach(f => validateField(f));
}

function closePatientModal() {
    document.getElementById('patientModal').style.display = "none";
}

async function submitPatient(e) {
    e.preventDefault();
    if(document.getElementById('btnPatientSubmit').disabled) return; // double check

    const id = document.getElementById('patientId').value;
    const data = {
        name: document.getElementById('patientName').value.trim(),
        phone: document.getElementById('patientPhone').value.trim(),
        age: document.getElementById('patientAge').value ? parseInt(document.getElementById('patientAge').value) : null,
        secondary_contact: document.getElementById('patientSecondaryPhone').value.trim() || null
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
        fetchPatients();
        if (id && currentPatientId == id) viewPatient(id);
    } else {
        alert("Server Error. Please try again.");
    }
}

// ----------------------------------------------------------------------
// Visit Modal Logic
// ----------------------------------------------------------------------
function openVisitModal(patientId) {
    document.getElementById('visitForm').reset();
    document.getElementById('visitId').value = "";
    document.getElementById('visitPatientId').value = patientId;
    document.getElementById('visitModalTitle').innerText = "New Clinical Visit";
    clearValidationState('visitForm');
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
    if(document.getElementById('btnVisitSubmit').disabled) return;

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
        frame_details: document.getElementById('vFrameDetails').value || null,
        
        // Exact dropdown matching
        lens_type: document.getElementById('vLensType').value || null,
        lens_index: document.getElementById('vLensIndex').value || null,
        coatings: document.getElementById('vCoatings').value || null,
        payment_method: document.getElementById('vPaymentMethod').value || null,
        
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
        viewPatient(pId);
    } else {
        alert("Failed to save clinical record.");
    }
}

async function sendWhatsAppBill(visitId) {
    const res = await fetch(`/api/visits/${visitId}/whatsapp-bill`);
    if(res.ok) {
        const data = await res.json();
        window.open(data.url, '_blank');
    } else {
        alert("Failed to generate bill link.");
    }
}

async function deletePatient(id) {
    if(!confirm("Are you sure you want to delete this patient? All their visits will be deleted as well.")) {
        return;
    }
    const res = await fetch(`/api/patients/${id}`, {
        method: 'DELETE'
    });
    if (res.ok) {
        backToList();
    } else {
        alert("Server Error. Could not delete patient.");
    }
}
