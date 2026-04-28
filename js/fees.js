// ═══════════════════════════════════════════
//  fees.js — Fee Tracker Page Logic
// ═══════════════════════════════════════════
requireAuth();

let allStudents   = [];
let feeMap        = {};       // studentId -> fee doc data
let activeMonth   = currentMonth();
let statusFilter  = 'all';

// Pending pay confirmation state
let _pendingStudentId = null;
let _pendingAmount    = 0;

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
    const snap = await db.collection('students').orderBy('name').get();
    allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state">
        <div class="empty-icon">${allStudents.length===0?'👩‍🎓':'✅'}</div>
        <p>${allStudents.length===0
          ? 'No students added yet. <a href="students.html" style="color:var(--gold)">Add students →</a>'
          : 'No students match filter.'}</p>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((s, i) => {
    const fee      = feeMap[s.id];
    const isPaid   = fee?.status === 'paid';
    const paidDate = isPaid && fee?.paidDate ? formatDate(fee.paidDate) : '—';
    const method   = fee?.paymentMethod || '';
    const methodBadge = isPaid && method ? methodBadgeHTML(method) : '';
    const note     = fee?.note ? `<div class="fee-note" title="${esc(fee.note)}">📝 ${esc(fee.note)}</div>` : '';

    // WhatsApp button — only for unpaid students
    const waBtn = !isPaid
      ? `<button class="btn-wa" onclick="sendWhatsApp('${s.id}')" title="Send WhatsApp reminder">
           <span>📲</span>
         </button>`
      : '';

    return `
    <tr id="row-${s.id}">
      <td class="text-muted fs-12">${i+1}</td>
      <td>
        <div class="fw-600">${esc(s.name)}</div>
        ${note}
      </td>
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
      <td class="paid-date-cell">
        ${isPaid ? `<div>${paidDate}</div>${methodBadge}` : '—'}
      </td>
      <td>
        ${isPaid
          ? `<button class="btn btn-danger btn-xs" onclick="markUnpaid('${s.id}')">↩ Undo</button>`
          : `<button class="btn btn-success btn-xs" onclick="openPayModal('${s.id}',${s.monthlyFee})">✅ Mark Paid</button>`
        }
      </td>
      <td>${waBtn}</td>
    </tr>`;
  }).join('');
}

function methodBadgeHTML(method) {
  const map = {
    cash:   { label:'💵 Cash',   cls:'badge-gray' },
    bank:   { label:'🏦 Bank',   cls:'badge-gray' },
    online: { label:'📱 Online', cls:'badge-gray' }
  };
  const m = map[method] || { label: method, cls:'badge-gray' };
  return `<span class="badge ${m.cls}" style="font-size:10px;margin-top:4px">${m.label}</span>`;
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

// ─── Payment Method Modal ─────────────────
function openPayModal(studentId, amount) {
  _pendingStudentId = studentId;
  _pendingAmount    = amount;

  const s = allStudents.find(x => x.id === studentId);
  const nameEl = document.getElementById('pay-modal-name');
  const amtEl  = document.getElementById('pay-modal-amount');
  if (nameEl) nameEl.textContent = s?.name || 'Student';
  if (amtEl)  amtEl.textContent  = fmtLKR(amount);

  // Reset form
  document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector('.method-btn[data-method="cash"]')?.classList.add('selected');
  const noteEl = document.getElementById('pay-note');
  if (noteEl) noteEl.value = '';

  openModal('pay-method-modal');
}

function confirmPay() {
  const method = document.querySelector('.method-btn.selected')?.dataset.method || 'cash';
  const note   = document.getElementById('pay-note')?.value.trim() || '';
  closeModal('pay-method-modal');
  markPaid(_pendingStudentId, _pendingAmount, method, note);
}

// ─── Toggle Paid/Unpaid ───────────────────
async function toggleFee(studentId, currentlyPaid) {
  if (currentlyPaid) await markUnpaid(studentId);
  else {
    const s = allStudents.find(x=>x.id===studentId);
    openPayModal(studentId, s?.monthlyFee||0);
  }
}

async function markPaid(studentId, amount, method='cash', note='') {
  try {
    const feeId = `${studentId}_${activeMonth}`;
    const data = {
      studentId,
      month:         activeMonth,
      status:        'paid',
      amount:        Number(amount),
      paymentMethod: method,
      paidDate:      firebase.firestore.FieldValue.serverTimestamp(),
      paidAt:        firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:     firebase.firestore.FieldValue.serverTimestamp()
    };
    if (note) data.note = note;

    await db.collection('fees').doc(feeId).set(data);
    feeMap[studentId] = { docId: feeId, ...data, paidDate: new Date(), paidAt: new Date() };
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
        paymentMethod: 'cash',
        paidDate:  firebase.firestore.FieldValue.serverTimestamp(),
        paidAt:    firebase.firestore.FieldValue.serverTimestamp(),
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

// ─── WhatsApp Reminder ────────────────────
function buildWAMessage(student) {
  const month = fmtMonth(activeMonth);
  return `Hello! 🙏\n\nThis is a reminder that *${student.name}*'s class fee for *${month}* is still unpaid.\n\n💰 Amount Due: *${fmtLKR(student.monthlyFee)}*\n\nPlease make the payment at your earliest convenience.\n\nThank you!\n🎓 ZERO TAMIL Kids`;
}

function sendWhatsApp(studentId) {
  const s = allStudents.find(x => x.id === studentId);
  if (!s) return;

  const message = buildWAMessage(s);
  const encoded = encodeURIComponent(message);

  if (s.contact && s.contact.trim()) {
    // Clean phone number — remove spaces, dashes; add country code if needed
    let phone = s.contact.replace(/[\s\-\(\)]/g, '');
    if (phone.startsWith('0')) phone = '94' + phone.slice(1); // Sri Lanka: 0XX -> 94XX
    if (!phone.startsWith('+') && !phone.startsWith('94')) phone = '94' + phone;
    phone = phone.replace('+', '');
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  } else {
    // No phone — copy message to clipboard
    navigator.clipboard.writeText(message).then(() => {
      showToast(`📋 Message for ${s.name} copied! (No phone number saved)`, 'info');
    }).catch(() => {
      // Fallback: open generic WA
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    });
  }
}

function sendAllUnpaidWhatsApp() {
  const unpaid = allStudents.filter(s => feeMap[s.id]?.status !== 'paid');
  if (unpaid.length === 0) {
    showToast('🎉 All students have paid this month!', 'info'); return;
  }

  // Build combined message list to copy
  const lines = unpaid.map(s =>
    `• ${s.name} — ${fmtLKR(s.monthlyFee)}`
  ).join('\n');

  const summary = `📋 *Unpaid Students — ${fmtMonth(activeMonth)}*\n\n${lines}\n\nTotal Unpaid: ${unpaid.length} student${unpaid.length!==1?'s':''}`;

  navigator.clipboard.writeText(summary).then(() => {
    showToast(`📋 Unpaid list copied to clipboard (${unpaid.length} students)`, 'info');
  }).catch(() => showToast('Could not copy to clipboard.', 'error'));

  // Open WhatsApp for each student that has a phone number
  const withPhone = unpaid.filter(s => s.contact && s.contact.trim());
  if (withPhone.length > 0) {
    // Open first one; browser popup blocker may block multiple windows
    sendWhatsApp(withPhone[0].id);
    if (withPhone.length > 1) {
      showToast(`📲 Opened WhatsApp for ${withPhone[0].name}. Send individually for others.`, 'info');
    }
  }
}

// ─── Print Report ─────────────────────────
function printReport() {
  // Build print content
  const monthLabel = fmtMonth(activeMonth);
  const total     = allStudents.length;
  const paidList  = allStudents.filter(s => feeMap[s.id]?.status === 'paid');
  const paid      = paidList.length;
  const unpaid    = total - paid;
  const collected = paidList.reduce((acc, s) => acc + (Number(feeMap[s.id]?.amount)||0), 0);
  const expected  = allStudents.reduce((acc,s)=>acc+(Number(s.monthlyFee)||0), 0);
  const pct       = expected > 0 ? Math.round((collected/expected)*100) : 0;

  const rows = allStudents.map((s, i) => {
    const fee    = feeMap[s.id];
    const isPaid = fee?.status === 'paid';
    const method = fee?.paymentMethod ? `(${fee.paymentMethod})` : '';
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${esc(s.name)}</strong></td>
      <td>Grade ${s.grade}</td>
      <td>${fmtLKR(s.monthlyFee)}</td>
      <td style="color:${isPaid?'#27ae60':'#e74c3c'};font-weight:700">
        ${isPaid ? `✓ Paid ${method}` : '✗ Unpaid'}
      </td>
      <td>${isPaid && fee?.paidDate ? formatDate(fee.paidDate) : '—'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <title>Fee Report — ${monthLabel}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;color:#111;font-size:13px}
      h1{font-size:20px;margin-bottom:4px}
      .subtitle{color:#555;font-size:13px;margin-bottom:20px}
      .stats{display:flex;gap:30px;margin-bottom:20px;padding:14px 18px;
             background:#f8f8f8;border-radius:8px;border:1px solid #ddd}
      .stat{text-align:center}
      .stat .val{font-size:22px;font-weight:800}
      .stat .lbl{font-size:11px;color:#777;text-transform:uppercase;letter-spacing:0.5px}
      .green{color:#27ae60}.red{color:#e74c3c}.gold{color:#e67e22}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th{background:#f0f0f0;padding:9px 12px;text-align:left;font-size:11px;
         text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #ddd}
      td{padding:9px 12px;border-bottom:1px solid #eee;font-size:13px}
      tr:last-child td{border-bottom:none}
      .footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center}
      @media print{body{padding:15px}}
    </style>
  </head><body>
    <h1>🎓 ZERO TAMIL Kids — Fee Report</h1>
    <div class="subtitle">📅 ${monthLabel} &nbsp;·&nbsp; Printed on ${new Date().toLocaleDateString('en-LK',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
    <div class="stats">
      <div class="stat"><div class="val gold">${total}</div><div class="lbl">Total Students</div></div>
      <div class="stat"><div class="val green">${paid}</div><div class="lbl">Paid</div></div>
      <div class="stat"><div class="val red">${unpaid}</div><div class="lbl">Unpaid</div></div>
      <div class="stat"><div class="val green" style="font-size:16px">${fmtLKR(collected)}</div><div class="lbl">Collected</div></div>
      <div class="stat"><div class="val red" style="font-size:16px">${fmtLKR(expected-collected)}</div><div class="lbl">Outstanding</div></div>
      <div class="stat"><div class="val gold">${pct}%</div><div class="lbl">Collection Rate</div></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Student Name</th><th>Grade</th><th>Fee</th><th>Status</th><th>Paid Date</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">ZERO TAMIL Kids · Class Fee Management System</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
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
