// ═══════════════════════════════════════════
//  dashboard.js — Dashboard Page Logic
// ═══════════════════════════════════════════
requireAuth();

let allStudents = [];
let allFees     = [];

auth.onAuthStateChanged(async user => {
  if (!user) return;
  const emailEl = document.getElementById('user-email-display');
  if (emailEl) emailEl.textContent = user.email;

  // Set date info
  const now = new Date();
  const dateEl = document.getElementById('today-date');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-LK',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const cm = currentMonth();
  document.getElementById('current-month-label').textContent  = '📅 ' + fmtMonth(cm);
  document.getElementById('unpaid-month-label').textContent   = fmtMonth(cm);

  await loadDashboard(cm);
});

async function loadDashboard(month) {
  try {
    // Load students
    const snap = await db.collection('students').orderBy('name').get();
    allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Load fees for this month
    const feeSnap = await db.collection('fees')
      .where('month','==', month).get();
    allFees = feeSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderStats(month);
    renderGradeSummary();
    renderUnpaidList(month);
  } catch(e) {
    console.error(e);
    showToast('Error loading dashboard data.','error');
  }
}

function renderStats(month) {
  const total    = allStudents.length;
  const paidFees = allFees.filter(f => f.status === 'paid');
  const paidIds  = new Set(paidFees.map(f => f.studentId));

  const paid     = paidIds.size;
  const unpaid   = total - paid;

  const expectedTotal   = allStudents.reduce((s,st) => s + (Number(st.monthlyFee)||0), 0);
  const collectedTotal  = paidFees.reduce((s,f) => s + (Number(f.amount)||0), 0);
  const outstandingTotal= expectedTotal - collectedTotal;
  const pct = expectedTotal > 0 ? Math.round((collectedTotal/expectedTotal)*100) : 0;

  setText('stat-total',    total);
  setText('stat-paid',     paid);
  setText('stat-unpaid',   unpaid);
  setText('stat-expected', `<small>LKR</small> ${Number(expectedTotal).toLocaleString()}`);
  setText('stat-paid-amount',    fmtLKR(collectedTotal) + ' collected');
  setText('stat-unpaid-amount',  fmtLKR(outstandingTotal) + ' outstanding');

  setText('collection-pct',       pct + '%');
  setText('collected-amount',     fmtLKR(collectedTotal));
  setText('outstanding-amount',   fmtLKR(outstandingTotal));

  const bar = document.getElementById('collection-bar');
  if (bar) {
    bar.style.width = pct + '%';
    bar.className   = 'progress-fill ' + (pct >= 80 ? 'green' : pct >= 40 ? '' : 'red');
  }
}

function renderGradeSummary() {
  const el = document.getElementById('grade-summary-list');
  if (!el) return;

  // Count students per grade
  const gradeCounts = {};
  allStudents.forEach(s => {
    const g = s.grade || '?';
    if (!gradeCounts[g]) gradeCounts[g] = { count: 0, fee: 0 };
    gradeCounts[g].count++;
    gradeCounts[g].fee += Number(s.monthlyFee) || 0;
  });

  if (Object.keys(gradeCounts).length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">👩‍🎓</div><p>No students yet</p></div>';
    return;
  }

  const grades = Object.keys(gradeCounts).sort((a,b)=>Number(a)-Number(b));
  el.innerHTML = grades.map(g => `
    <div class="d-flex justify-between align-center" style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div class="d-flex align-center gap-2">
        <span class="badge badge-gold">Grade ${g}</span>
        <span style="font-size:13px">${gradeCounts[g].count} student${gradeCounts[g].count!==1?'s':''}</span>
      </div>
      <span class="fw-600" style="font-size:13px;color:var(--gold)">${fmtLKR(gradeCounts[g].fee)}</span>
    </div>
  `).join('');
}

function renderUnpaidList(month) {
  const el = document.getElementById('unpaid-list');
  if (!el) return;

  const paidIds = new Set(allFees.filter(f=>f.status==='paid').map(f=>f.studentId));
  const unpaidStudents = allStudents.filter(s => !paidIds.has(s.id));

  if (unpaidStudents.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><p>All students have paid for ${fmtMonth(month)}!</p></div>`;
    return;
  }

  el.innerHTML = `
    <div class="table-wrap" style="border:none">
      <table>
        <thead><tr>
          <th>Name</th><th>Grade</th><th>Amount Due</th>
        </tr></thead>
        <tbody>
          ${unpaidStudents.map(s=>`
            <tr>
              <td><strong>${esc(s.name)}</strong></td>
              <td><span class="badge badge-gold">Grade ${s.grade}</span></td>
              <td class="text-red fw-600">${fmtLKR(s.monthlyFee)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function setText(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
