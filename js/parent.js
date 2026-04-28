// ═══════════════════════════════════════════════════════════
//  parent.js — Public Parent Portal (No Auth Required)
//  Flow: Select Grade → Select Student → View Payment Status
// ═══════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────
let _allStudents   = [];   // all students from Firestore
let _selectedGrade = null;
let _selectedStudent = null;

// ── Init ───────────────────────────────────────────────────
(async function init() {
  try {
    showSpinner();
    const snap = await db.collection('students').orderBy('name').get();
    _allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    showGradeStep();
  } catch(e) {
    console.error(e);
    showError('Could not load data. Please refresh the page.');
  }
})();

// ═══════════════════════════════════════════════════════════
//  STEP 1 — Grade Selection
// ═══════════════════════════════════════════════════════════
function showGradeStep() {
  _selectedGrade   = null;
  _selectedStudent = null;

  // Count students per grade
  const gradeCounts = {};
  _allStudents.forEach(s => {
    const g = String(s.grade || '?');
    gradeCounts[g] = (gradeCounts[g] || 0) + 1;
  });

  // Get sorted list of grades that actually have students
  const grades = Object.keys(gradeCounts).sort((a, b) => Number(a) - Number(b));

  updateBreadcrumb('grade');

  if (grades.length === 0) {
    setContent(`
      <div class="step-hero">
        <div class="step-badge">👨‍👩‍👧 Parent Portal</div>
        <h2>Check Your Child's<br/><span>Fee Payment Status</span></h2>
      </div>
      <div class="empty-card">
        <div class="empty-icon">📚</div>
        <div class="empty-title">No Students Enrolled Yet</div>
        <div class="empty-sub">Please contact your class teacher.</div>
      </div>`);
    return;
  }

  const cards = grades.map(g => `
    <div class="grade-card" onclick="showStudentStep('${g}')" role="button" aria-label="Grade ${g}">
      <div class="grade-num">${g}</div>
      <div class="grade-lbl">Grade</div>
      <div class="grade-count">${gradeCounts[g]} student${gradeCounts[g] !== 1 ? 's' : ''}</div>
    </div>`).join('');

  setContent(`
    <div class="step-hero">
      <div class="step-badge">👨‍👩‍👧 Parent Portal</div>
      <h2>Select Your Child's<br/><span>Grade</span></h2>
      <p>Tap your child's grade to see the student list.</p>
    </div>
    <div class="grade-grid">${cards}</div>`);
}

// ═══════════════════════════════════════════════════════════
//  STEP 2 — Student List for Selected Grade
// ═══════════════════════════════════════════════════════════
async function showStudentStep(grade) {
  _selectedGrade   = grade;
  _selectedStudent = null;

  updateBreadcrumb('student');

  // Show loading immediately
  setContent(`
    <button class="back-btn" onclick="showGradeStep()">← Back to Grades</button>
    <div class="step-hero">
      <div class="step-badge">📚 Grade ${grade}</div>
      <h2>Select Your<br/><span>Child's Name</span></h2>
      <p>Tap your child's name to see their payment status.</p>
    </div>
    <div class="spinner-wrap"><div class="spinner"></div></div>`);

  // Get current month's fee status for this grade's students
  const cm = currentMonth();
  const students = _allStudents.filter(s => String(s.grade) === String(grade));

  if (students.length === 0) {
    setContent(`
      <button class="back-btn" onclick="showGradeStep()">← Back to Grades</button>
      <div class="empty-card">
        <div class="empty-icon">👩‍🎓</div>
        <div class="empty-title">No Students in Grade ${grade}</div>
        <div class="empty-sub">Please contact your class teacher.</div>
      </div>`);
    return;
  }

  // Load fees for this month for these students
  let feeStatus = {}; // studentId -> 'paid' | 'unpaid'
  try {
    const feeSnap = await db.collection('fees').where('month', '==', cm).get();
    feeSnap.docs.forEach(d => {
      const data = d.data();
      feeStatus[data.studentId] = data.status;
    });
  } catch(e) {
    console.error('Fee load error:', e);
    // Continue without fee status indicators
  }

  const studentCards = students.map(s => {
    const status = feeStatus[s.id] === 'paid' ? 'paid' : 'unpaid';
    const statusLabel = status === 'paid' ? '✓ Paid' : '✗ Unpaid';
    const statusColor = status === 'paid' ? 'var(--green)' : 'var(--red)';
    return `
      <div class="student-card" onclick="showDetailStep('${s.id}')" role="button">
        <div class="student-ava">👤</div>
        <div class="student-info">
          <div class="name">${esc(s.name)}</div>
          <div class="sub" style="color:${statusColor}">${statusLabel} · ${fmtLKR(s.monthlyFee)}/month</div>
        </div>
        <div class="student-status-dot ${status}"></div>
        <div class="student-arrow">›</div>
      </div>`;
  }).join('');

  const paidCount   = students.filter(s => feeStatus[s.id] === 'paid').length;
  const unpaidCount = students.length - paidCount;

  setContent(`
    <button class="back-btn" onclick="showGradeStep()">← Back to Grades</button>
    <div class="step-hero">
      <div class="step-badge">📚 Grade ${grade} · ${students.length} Student${students.length !== 1 ? 's' : ''}</div>
      <h2>Select Your<br/><span>Child's Name</span></h2>
      <p>
        <span style="color:var(--green);font-weight:600">${paidCount} paid</span>
        &nbsp;·&nbsp;
        <span style="color:var(--red);font-weight:600">${unpaidCount} unpaid</span>
        &nbsp;this month
      </p>
    </div>
    <div class="student-grid">${studentCards}</div>`);
}

// ═══════════════════════════════════════════════════════════
//  STEP 3 — Payment Detail for Selected Student
// ═══════════════════════════════════════════════════════════
async function showDetailStep(studentId) {
  const student = _allStudents.find(s => s.id === studentId);
  if (!student) return;
  _selectedStudent = student;

  updateBreadcrumb('detail');

  // Show loading with back button
  setContent(`
    <button class="back-btn" onclick="showStudentStep('${_selectedGrade}')">← Back to Grade ${_selectedGrade}</button>
    <div class="spinner-wrap"><div class="spinner"></div></div>`);

  const cm     = currentMonth();
  const months = lastNMonths(6);

  try {
    // Load all fee records for this student
    const feeSnap = await db.collection('fees')
      .where('studentId', '==', studentId)
      .get();

    const feeMap = {};
    feeSnap.docs.forEach(d => {
      const data = d.data();
      if (data.month) feeMap[data.month] = data;
    });

    // Current month
    const currentFee = feeMap[cm];
    const isPaid     = currentFee?.status === 'paid';
    const paidDate   = isPaid && currentFee?.paidAt
      ? formatDate(currentFee.paidAt) : null;
    const method     = currentFee?.paymentMethod || null;

    // Current month status block
    const statusBlock = `
      <div class="status-big ${isPaid ? 'paid' : 'unpaid'}">
        <div class="status-icon-big">${isPaid ? '✅' : '❌'}</div>
        <div class="status-text">
          <div class="label ${isPaid ? 'paid' : 'unpaid'}">${isPaid ? 'Fee Paid' : 'Fee Unpaid'}</div>
          <div class="sub">
            ${isPaid
              ? (paidDate ? `Paid on ${paidDate}${method ? ' · ' + methodLabel(method) : ''}` : 'Payment recorded')
              : `Due for ${fmtMonth(cm)}`}
          </div>
        </div>
        <div class="status-amount">
          <div class="amt ${isPaid ? 'paid' : 'unpaid'}">${fmtLKR(student.monthlyFee || 0)}</div>
          <div class="lbl">${isPaid ? 'Paid' : 'Due'}</div>
        </div>
      </div>`;

    // History (last 5 months, skip current)
    const historyRows = months.slice(1).map(ym => {
      const fee  = feeMap[ym];
      const paid = fee?.status === 'paid';
      return `
        <div class="history-row">
          <span class="history-month">${fmtMonth(ym)}</span>
          <div class="history-right">
            <span class="history-amt">${fmtLKR(student.monthlyFee || 0)}</span>
            <span class="pill ${paid ? 'paid' : 'unpaid'}">${paid ? '✓ Paid' : '✗ Unpaid'}</span>
          </div>
        </div>`;
    }).join('');

    setContent(`
      <button class="back-btn" onclick="showStudentStep('${_selectedGrade}')">← Back to Grade ${_selectedGrade}</button>
      <div class="result-card">

        <!-- Student identity bar -->
        <div class="student-bar">
          <div class="s-avatar">👤</div>
          <div>
            <div class="s-name">${esc(student.name)}</div>
            <div class="s-meta">
              Monthly Fee: <strong>${fmtLKR(student.monthlyFee || 0)}</strong>
              <span class="grade-badge">Grade ${student.grade}</span>
            </div>
          </div>
        </div>

        <!-- Current month -->
        <div class="current-status">
          <div class="section-label">📅 ${fmtMonth(cm)} — Current Month</div>
          ${statusBlock}
        </div>

        <!-- History -->
        <div class="history-section">
          <div class="section-label">📋 Past 5 Months — Payment History</div>
          ${historyRows || '<div style="font-size:13px;color:var(--muted)">No history available.</div>'}
        </div>

      </div>`);

  } catch(e) {
    console.error(e);
    showError('Could not load payment details. Please try again.');
  }
}

// ═══════════════════════════════════════════════════════════
//  Breadcrumb
// ═══════════════════════════════════════════════════════════
function updateBreadcrumb(step) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;

  if (step === 'grade') {
    bc.innerHTML = `<span class="crumb active">👨‍👩‍👧 Parent Portal</span>`;
  } else if (step === 'student') {
    bc.innerHTML = `
      <span class="crumb" onclick="showGradeStep()">👨‍👩‍👧 Portal</span>
      <span class="sep">›</span>
      <span class="crumb active">Grade ${_selectedGrade}</span>`;
  } else if (step === 'detail') {
    bc.innerHTML = `
      <span class="crumb" onclick="showGradeStep()">👨‍👩‍👧 Portal</span>
      <span class="sep">›</span>
      <span class="crumb" onclick="showStudentStep('${_selectedGrade}')">Grade ${_selectedGrade}</span>
      <span class="sep">›</span>
      <span class="crumb active">${esc(_selectedStudent?.name || '')}</span>`;
  }
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════
function setContent(html) {
  const el = document.getElementById('content');
  if (el) el.innerHTML = html;
}

function showSpinner() {
  setContent(`
    <div class="step-hero">
      <div class="step-badge">👨‍👩‍👧 Parent Portal</div>
      <h2>Check Your Child's<br/><span>Fee Payment Status</span></h2>
    </div>
    <div class="spinner-wrap"><div class="spinner"></div></div>`);
}

function showError(msg) {
  setContent(`
    <div class="empty-card">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">Something Went Wrong</div>
      <div class="empty-sub">${msg}</div>
    </div>`);
}

function fmtLKR(amount) {
  return 'LKR ' + Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 0 });
}

function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function lastNMonths(n) {
  const result = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

function formatDate(ts) {
  if (!ts) return null;
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return null; }
}

function methodLabel(method) {
  return { cash: '💵 Cash', bank: '🏦 Bank Transfer', online: '📱 Online' }[method] || method;
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
