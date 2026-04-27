// ═══════════════════════════════════════════
//  fees.js — Fee Tracker Page Logic
// ═══════════════════════════════════════════
requireAuth();

let allStudents   = [];
let feeMap        = {};       // studentId -> fee doc data
let activeMonth   = currentMonth();
let statusFilter  = 'all';

auth.onAuthStateChanged(async user => {
  if (!user) return;
  const el = document.getElementById('user-email-display');
  if (el) el.textContent = user.email;
  updateMonthDisplay();
  await loadAll();
});

// ─── Month Navigation ─────────────────────
function changeMonth(dir) {
  const [y, m] = activeMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  activeMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  updateMonthDisplay();
  loadAll();
}

function goToCurrentMonth() {
  activeMonth = currentMonth();
  updateMonthDisplay();
  loadAll();
}

function updateMonthDisplay() {
  const el = document.getElementById('month-display');
  if (el) el.textContent = fmtMonth(activeMonth);
}

// ─── Load Data ────────────────────────────
async function loadAll() {
  try {
    // Load students
    const snap = await db.collection('students').orderBy('name').get();
    allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Load fees for active month
    const feeSnap = await db.collection('fees').where('month','==', activeMonth).get();
    feeMap = {};
    feeSnap.docs.forEach(d => { feeMap[d.data().studentId] = { docId: d.id, ...d.data() }; });

    renderFeeTable();
    renderSummary();
  } catch(e) {
    console.error(e);
    showToast('Error loading fee data.', 'error');
  }
}

// ─── Render Table ─────────────────────────
function renderFeeTable() {
  const search = (document.getElementById('fee-search')?.value||'').toLowerCase();
  const tbody  = document.getElementById('fee-tbody');

  let list = allStudents.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search);
    const fee         = feeMap[s.id];
    const isPaid      = fee?.status === 'paid';
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'paid'   && isPaid)
      || (statusFilter === 'unpaid' && !isPaid);
    return matchSearch && matchStatus;
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-icon">${allStudents.length===0?'👩‍🎓':'✅'}</div>
        <p>${allStudents.length===0
          ? 'No students added yet. <a href="students.html" style="color:var(--gold)">Add students →</a>'
          : 'No students match filter.'}</p>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((s, i) => {
    const fee    = feeMap[s.id];
    const isPaid = fee?.status === 'paid';
    const paidDate = isPaid && fee?.paidDate
      ? formatDate(fee.paidDate)
      : '—';

    return `
    <tr id="row-${s.id}">
      <td class="text-muted fs-12">${i+1}</td>
      <td class="fw-600">${esc(s.name)}</td>
      <td><span class="badge badge-gold">Grade ${s.grade}</span></td>
      <td class="fw-600">${fmtLKR(s.monthlyFee)}</td>
      <td>
        <div class="fee-status-cell">
          <div class="status-toggle ${isPaid?'paid-state':''}" onclick="toggleFee('${s.id}',${isPaid})">
            <div class="toggle-track ${isPaid?'paid':''}">
              <div class="toggle-thumb"></div>
            </div>
            <span class="toggle-label-paid">Paid</span>
            <span class="toggle-label-unpaid">Unpaid</span>
          </div>
        </div>
      </td>
      <td class="paid-date-cell">${paidDate}</td>
      <td>
        ${isPaid
          ? `<button class="btn btn-danger btn-xs" onclick="markUnpaid('${s.id}')">↩ Undo</button>`
          : `<button class="btn btn-success btn-xs" onclick="markPaid('${s.id}',${s.monthlyFee})">✅ Mark Paid</button>`
        }
      </td>
    </tr>`;
  }).join('');
}

// ─── Summary Bar ──────────────────────────
function renderSummary() {
  const total     = allStudents.length;
  const paidList  = allStudents.filter(s => feeMap[s.id]?.status === 'paid');
  const paid      = paidList.length;
  const unpaid    = total - paid;
  const collected = paidList.reduce((acc, s) => acc + (Number(feeMap[s.id]?.amount)||0), 0);
  const expected  = allStudents.reduce((acc,s)=>acc+(Number(s.monthlyFee)||0), 0);
  const outstanding = expected - collected;
  const pct = expected > 0 ? Math.round((collected/expected)*100) : 0;

  setText('sum-total',       total);
  setText('sum-paid',        paid);
  setText('sum-unpaid',      unpaid);
  setText('sum-collected',   fmtLKR(collected));
  setText('sum-outstanding', fmtLKR(outstanding));
  setText('sum-pct',         pct + '%');
  const bar = document.getElementById('sum-bar');
  if (bar) {
    bar.style.width = pct + '%';
    bar.className   = 'progress-fill ' + (pct>=80?'green':pct>=40?'':'red');
  }
}

// ─── Toggle Paid/Unpaid ───────────────────
async function toggleFee(studentId, currentlyPaid) {
  if (currentlyPaid) await markUnpaid(studentId);
  else {
    const s = allStudents.find(x=>x.id===studentId);
    await markPaid(studentId, s?.monthlyFee||0);
  }
}

async function markPaid(studentId, amount) {
  try {
    const feeId = `${studentId}_${activeMonth}`;
    await db.collection('fees').doc(feeId).set({
      studentId,
      month:    activeMonth,
      status:   'paid',
      amount:   Number(amount),
      paidDate: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    feeMap[studentId] = { docId: feeId, studentId, month: activeMonth, status:'paid', amount: Number(amount), paidDate: new Date() };
    renderFeeTable();
    renderSummary();
    const s = allStudents.find(x=>x.id===studentId);
    showToast(`✅ ${s?.name||'Student'} marked as paid!`);
  } catch(e) {
    console.error(e);
    showToast('Error marking as paid.','error');
  }
}

async function markUnpaid(studentId) {
  try {
    const feeId = `${studentId}_${activeMonth}`;
    await db.collection('fees').doc(feeId).delete();
    delete feeMap[studentId];
    renderFeeTable();
    renderSummary();
    const s = allStudents.find(x=>x.id===studentId);
    showToast(`↩ ${s?.name||'Student'} marked as unpaid.`,'info');
  } catch(e) {
    console.error(e);
    showToast('Error updating status.','error');
  }
}

// ─── Mark All Paid ────────────────────────
async function markAllPaid() {
  const btn = document.getElementById('mark-all-btn');
  btn.disabled = true; btn.textContent = 'Processing…';
  try {
    const batch = db.batch();
    let count = 0;
    allStudents.forEach(s => {
      if (feeMap[s.id]?.status === 'paid') return;
      const ref = db.collection('fees').doc(`${s.id}_${activeMonth}`);
      batch.set(ref, {
        studentId: s.id, month: activeMonth,
        status:'paid', amount: Number(s.monthlyFee),
        paidDate: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      count++;
    });
    await batch.commit();
    showToast(`✅ ${count} student${count!==1?'s':''} marked as paid!`);
    await loadAll();
  } catch(e) {
    console.error(e);
    showToast('Error marking all paid.','error');
  } finally {
    btn.disabled = false; btn.textContent = '✅ Mark All Paid';
  }
}

// ─── Filters ──────────────────────────────
function filterFeeRows() { renderFeeTable(); }

function setStatusFilter(status, el) {
  statusFilter = status;
  document.querySelectorAll('.filter-tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderFeeTable();
}

// ─── Helpers ──────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id); if(el) el.textContent = val;
}
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function formatDate(ts) {
  if (!ts) return '—';
  try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('en-LK',{day:'2-digit',month:'short',year:'numeric'}); }
  catch { return '—'; }
}
