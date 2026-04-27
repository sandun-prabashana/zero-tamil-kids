// ═══════════════════════════════════════════
//  students.js — Students Page Logic
// ═══════════════════════════════════════════
requireAuth();

let allStudents   = [];
let activeFilter  = 'all';
let deleteId      = null;

auth.onAuthStateChanged(async user => {
  if (!user) return;
  const el = document.getElementById('user-email-display');
  if (el) el.textContent = user.email;
  await loadStudents();
});

// ─── Load & Render ────────────────────────
async function loadStudents() {
  try {
    const snap = await db.collection('students').orderBy('name').get();
    allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStudents();
  } catch(e) {
    console.error(e);
    document.getElementById('students-tbody').innerHTML =
      '<tr><td colspan="7" class="empty-state"><p>Error loading students.</p></td></tr>';
  }
}

function renderStudents() {
  const search = (document.getElementById('search-input')?.value||'').toLowerCase();
  let list = allStudents.filter(s => {
    const matchGrade  = activeFilter === 'all' || String(s.grade) === activeFilter;
    const matchSearch = !search || s.name.toLowerCase().includes(search);
    return matchGrade && matchSearch;
  });

  const tbody = document.getElementById('students-tbody');
  const shownEl = document.getElementById('shown-count');
  const totalEl = document.getElementById('total-badge');

  if (shownEl) shownEl.textContent = list.length;
  if (totalEl) totalEl.textContent = `${allStudents.length} total`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-icon">👩‍🎓</div>
        <p>${allStudents.length === 0 ? 'No students yet. Add your first student!' : 'No students match your filter.'}</p>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((s, i) => `
    <tr>
      <td class="text-muted fs-12">${i+1}</td>
      <td>
        <div class="fw-600">${esc(s.name)}</div>
        ${s.notes ? `<div class="fs-12 text-muted">${esc(s.notes)}</div>` : ''}
      </td>
      <td><span class="badge badge-gold">Grade ${s.grade}</span></td>
      <td class="fw-600 text-gold">${fmtLKR(s.monthlyFee)}</td>
      <td class="text-muted fs-12">${esc(s.contact||'—')}</td>
      <td class="text-muted fs-12">${formatDate(s.joinDate)}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-secondary btn-xs" onclick="openEdit('${s.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-xs" onclick="openDelete('${s.id}','${esc(s.name)}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── Filters ──────────────────────────────
function filterStudents() { renderStudents(); }

function setGradeFilter(grade, el) {
  activeFilter = grade;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderStudents();
}

// ─── Add / Edit Modal ─────────────────────
function openEdit(id) {
  const s = allStudents.find(x => x.id === id);
  if (!s) return;
  document.getElementById('modal-title').textContent         = 'Edit Student';
  document.getElementById('edit-student-id').value          = s.id;
  document.getElementById('s-name').value                   = s.name || '';
  document.getElementById('s-grade').value                  = s.grade || '';
  document.getElementById('s-fee').value                    = s.monthlyFee || '';
  document.getElementById('s-contact').value                = s.contact || '';
  document.getElementById('s-notes').value                  = s.notes || '';
  document.getElementById('save-btn').textContent           = 'Update Student';
  openModal('add-modal');
}

// Called from the "Add Student" button in HTML
function openAddModal() {
  document.getElementById('modal-title').textContent  = 'Add New Student';
  document.getElementById('edit-student-id').value   = '';
  document.getElementById('student-form').reset();
  document.getElementById('save-btn').textContent     = 'Save Student';
  openModal('add-modal');
}

// Form submit — add or update
document.getElementById('student-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name    = document.getElementById('s-name').value.trim();
  const grade   = document.getElementById('s-grade').value;
  const fee     = parseFloat(document.getElementById('s-fee').value);
  const contact = document.getElementById('s-contact').value.trim();
  const notes   = document.getElementById('s-notes').value.trim();
  const editId  = document.getElementById('edit-student-id').value;

  if (!name || !grade || isNaN(fee) || fee < 0) {
    showToast('Please fill in all required fields.', 'error'); return;
  }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const data = {
    name, grade: parseInt(grade), monthlyFee: fee,
    contact: contact || '', notes: notes || '',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (editId) {
      await db.collection('students').doc(editId).update(data);
      showToast(`✅ ${name} updated successfully!`);
    } else {
      data.joinDate   = firebase.firestore.FieldValue.serverTimestamp();
      data.createdAt  = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('students').add(data);
      showToast(`✅ ${name} added successfully!`);
    }
    closeModal('add-modal');
    await loadStudents();
  } catch(err) {
    console.error(err);
    showToast('Error saving student. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editId ? 'Update Student' : 'Save Student';
  }
});

// ─── Delete ───────────────────────────────
function openDelete(id, name) {
  deleteId = id;
  document.getElementById('delete-student-name').textContent = name;
  openModal('delete-modal');
}

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  if (!deleteId) return;
  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled = true; btn.textContent = 'Deleting…';
  try {
    // Delete student
    await db.collection('students').doc(deleteId).delete();
    // Delete all fee records for this student
    const feeSnap = await db.collection('fees').where('studentId','==',deleteId).get();
    const batch = db.batch();
    feeSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    showToast('Student deleted successfully.');
    closeModal('delete-modal');
    deleteId = null;
    await loadStudents();
  } catch(err) {
    console.error(err);
    showToast('Error deleting student.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Delete';
  }
});

// ─── Helpers ──────────────────────────────
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function formatDate(ts) {
  if (!ts) return '—';
  try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('en-LK',{day:'2-digit',month:'short',year:'numeric'}); }
  catch{ return '—'; }
}
