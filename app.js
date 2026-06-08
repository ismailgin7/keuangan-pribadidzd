import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHWlHoXP-HiQIoDZYVi66qQTuj2Rg3zI4",
  authDomain: "keuangan-keluarga-dzd.firebaseapp.com",
  databaseURL: "https://keuangan-keluarga-dzd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "keuangan-keluarga-dzd",
  storageBucket: "keuangan-keluarga-dzd.firebasestorage.app",
  messagingSenderId: "904972809560",
  appId: "1:904972809560:web:1639fd8b6423aa134c612d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const transaksiRef = ref(db, 'transaksi');
const budgetRef = ref(db, 'budget');
const hpRef = ref(db, 'hutangpiutang');

let transaksi = [];
let tipeAktif = 'masuk';
let grafikInstance = null;
let grafikSaldoInstance = null;
let budget = {};
let hpData = [];
let hpTab = 'piutang';
let cicilanTargetKey = null;

const metodeList = ['cash', 'BNI', 'BSI', 'DANA', 'OVO', 'SeaBank', 'GoPay'];

document.getElementById('tanggal').valueAsDate = new Date();

onValue(transaksiRef, (snapshot) => {
  transaksi = [];
  snapshot.forEach((child) => {
    transaksi.unshift({ _key: child.key, ...child.val() });
  });
  render();
  renderBudget();
  renderGrafikAll();
});

onValue(budgetRef, (snapshot) => {
  budget = snapshot.val() || {};
  renderBudget();
});

onValue(hpRef, (snapshot) => {
  hpData = [];
  snapshot.forEach((child) => {
    hpData.unshift({ _key: child.key, ...child.val() });
  });
  renderHP();
});

// ======= TAB =======
function gotoTab(tabId, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  el.classList.add('active');
  if (tabId === 'grafik') renderGrafikAll();
}

// ======= FORMAT =======
function formatRupiah(angka) {
  return 'Rp ' + Math.round(angka).toLocaleString('id-ID');
}

// ======= TRANSAKSI =======
function setType(tipe) {
  tipeAktif = tipe;
  document.getElementById('btn-masuk').className = '';
  document.getElementById('btn-keluar').className = '';
  document.getElementById('btn-transfer').className = '';
  document.getElementById('form-transfer').style.display = 'none';
  document.getElementById('form-utama').style.display = 'block';

  if (tipe === 'masuk') {
    document.getElementById('btn-masuk').className = 'active-income';
    document.getElementById('kategori').innerHTML = `
      <option value="Gaji">Gaji</option>
      <option value="Usaha">Usaha</option>
      <option value="Investasi">Investasi</option>
      <option value="Piutang">Piutang</option>
      <option value="Tabungan">Tabungan</option>
      <option value="Lainnya">Lainnya</option>
    `;
  } else if (tipe === 'keluar') {
    document.getElementById('btn-keluar').className = 'active-expense';
    document.getElementById('kategori').innerHTML = `
      <option value="LAG">LAG</option>
      <option value="Sembako">Sembako</option>
      <option value="Toiletris">Toiletris</option>
      <option value="Pengasuh">Pengasuh</option>
      <option value="Kebutuhan Anak">Kebutuhan Anak</option>
      <option value="Liburan">Liburan</option>
      <option value="Makan">Makan</option>
      <option value="Transport">Transport</option>
      <option value="Tagihan">Tagihan</option>
      <option value="Kesehatan">Kesehatan</option>
      <option value="Hiburan">Hiburan</option>
      <option value="Pendidikan">Pendidikan</option>
      <option value="Hutang">Hutang</option>
      <option value="Lainnya">Lainnya</option>
    `;
  } else if (tipe === 'transfer') {
    document.getElementById('btn-transfer').className = 'active-transfer';
    document.getElementById('form-utama').style.display = 'none';
    document.getElementById('form-transfer').style.display = 'block';
    document.getElementById('transfer-tanggal').valueAsDate = new Date();
  }
}

function tambahTransaksi() {
  const keterangan = document.getElementById('keterangan').value.trim();
  const jumlah = parseFloat(document.getElementById('jumlah').value);
  const kategori = document.getElementById('kategori').value;
  const tanggal = document.getElementById('tanggal').value;
  const metode = document.getElementById('metode').value;

  if (!keterangan || !jumlah || jumlah <= 0 || !tanggal) {
    alert('Lengkapi semua kolom!');
    return;
  }

  push(transaksiRef, { id: Date.now(), tipe: tipeAktif, keterangan, jumlah, kategori, tanggal, metode });
  document.getElementById('keterangan').value = '';
  document.getElementById('jumlah').value = '';
}

function hapus(key) {
  if (!confirm('Hapus transaksi ini?')) return;
  remove(ref(db, 'transaksi/' + key));
}

function lakukanTransfer() {
  const dari = document.getElementById('transfer-dari').value;
  const ke = document.getElementById('transfer-ke').value;
  const jumlah = parseFloat(document.getElementById('transfer-jumlah').value);
  const tanggal = document.getElementById('transfer-tanggal').value;

  if (dari === ke) { alert('Akun asal dan tujuan tidak boleh sama!'); return; }
  if (!jumlah || jumlah <= 0) { alert('Isi jumlah transfer!'); return; }
  if (!tanggal) { alert('Isi tanggal!'); return; }

  push(transaksiRef, { id: Date.now(), tipe: 'keluar', keterangan: `Transfer ke ${ke}`, jumlah, kategori: 'Transfer', tanggal, metode: dari });
  push(transaksiRef, { id: Date.now() + 1, tipe: 'masuk', keterangan: `Transfer dari ${dari}`, jumlah, kategori: 'Transfer', tanggal, metode: ke });
  document.getElementById('transfer-jumlah').value = '';
  alert(`Transfer ${formatRupiah(jumlah)} dari ${dari} ke ${ke} berhasil!`);
}

// ======= RENDER UTAMA =======
function render() {
  const bulanIni = new Date().toISOString().slice(0, 7);
  const semuaBulan = [...new Set(transaksi.map(t => t.tanggal.slice(0, 7)))].sort().reverse();
  const filterEl = document.getElementById('filter-bulan');
  const dipilih = filterEl.value;

  filterEl.innerHTML = '<option value="">Semua Bulan</option>' +
    semuaBulan.map(b => {
      const [th, bl] = b.split('-');
      const label = new Date(th, bl - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      return `<option value="${b}" ${dipilih === b ? 'selected' : ''}>${label}</option>`;
    }).join('');

  const filtered = dipilih ? transaksi.filter(t => t.tanggal.slice(0, 7) === dipilih) : transaksi;
  const filteredBulanIni = transaksi.filter(t => t.tanggal.slice(0, 7) === bulanIni);

  // Kartu dashboard - pemasukan & pengeluaran bulan ini
  const totalMasuk = filteredBulanIni.filter(t => t.tipe === 'masuk' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const totalKeluar = filteredBulanIni.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);

  // Saldo total keseluruhan
  const allMasuk = transaksi.filter(t => t.tipe === 'masuk' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const allKeluar = transaksi.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const saldo = allMasuk - allKeluar;

  document.getElementById('total-masuk').textContent = formatRupiah(totalMasuk);
  document.getElementById('total-keluar').textContent = formatRupiah(totalKeluar);
  document.getElementById('saldo').textContent = formatRupiah(Math.abs(saldo));
  document.getElementById('saldo').style.color = saldo < 0 ? '#dc2626' : '#1e293b';

  // Saldo per rekening - hanya tampil yang ada transaksinya
  metodeList.forEach(m => {
    const adaTransaksi = transaksi.some(t => t.metode === m);
    const kartu = document.getElementById('saldo-' + m);
    if (!kartu) return;
    const wrapper = kartu.closest('.card');
    if (!adaTransaksi) {
      if (wrapper) wrapper.style.display = 'none';
      return;
    }
    if (wrapper) wrapper.style.display = 'block';
    const masuk = transaksi.filter(t => t.tipe === 'masuk' && t.metode === m).reduce((s,t) => s+t.jumlah, 0);
    const keluar = transaksi.filter(t => t.tipe === 'keluar' && t.metode === m).reduce((s,t) => s+t.jumlah, 0);
    const saldoM = masuk - keluar;
    kartu.textContent = formatRupiah(Math.abs(saldoM));
    kartu.style.color = saldoM < 0 ? '#dc2626' : '#1e293b';
  });

  // Riwayat transaksi full
  const list = document.getElementById('list-transaksi');
  if (filtered.length === 0) {
    list.innerHTML = '<li class="kosong">Tidak ada transaksi.</li>';
  } else {
    list.innerHTML = filtered.map(t => {
      const tgl = new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const sign = t.tipe === 'masuk' ? '+' : '-';
      return `
        <li>
          <div class="tx-info">
            <div class="tx-nama">${t.keterangan}</div>
            <div class="tx-meta">${t.kategori} · ${t.metode} · ${tgl}</div>
          </div>
          <div class="tx-nominal ${t.tipe}">${sign}${formatRupiah(t.jumlah)}</div>
          <button class="tx-hapus" onclick="hapus('${t._key}')">🗑</button>
        </li>
      `;
    }).join('');
  }

  // Transaksi mini di ringkasan (5 terakhir)
  const mini = document.getElementById('list-transaksi-mini');
  const last5 = transaksi.slice(0, 5);
  if (last5.length === 0) {
    mini.innerHTML = '<li class="kosong">Belum ada transaksi.</li>';
  } else {
    mini.innerHTML = last5.map(t => {
      const sign = t.tipe === 'masuk' ? '+' : '-';
      const color = t.tipe === 'masuk' ? '#16a34a' : '#dc2626';
      return `
        <li>
          <div>
            <div style="font-size:13px;font-weight:500;color:#1e293b">${t.keterangan}</div>
            <div style="font-size:11px;color:#94a3b8">${t.kategori} · ${t.metode}</div>
          </div>
          <div style="font-size:13px;font-weight:600;color:${color}">${sign}${formatRupiah(t.jumlah)}</div>
        </li>
      `;
    }).join('');
  }
}

// ======= BUDGET =======
function simpanBudget() {
  const kat = document.getElementById('budget-kat').value;
  const nominal = parseFloat(document.getElementById('budget-nominal').value);
  if (!nominal || nominal <= 0) { alert('Isi nominal anggaran!'); return; }
  set(ref(db, 'budget/' + kat), nominal);
  document.getElementById('budget-nominal').value = '';
}

function hapusBudget(kat) {
  remove(ref(db, 'budget/' + kat));
}

function renderBudget() {
  const bulanIni = new Date().toISOString().slice(0, 7);
  const keys = Object.keys(budget);
  const totalAnggaran = Object.values(budget).reduce((s, v) => s + v, 0);
  const totalTerpakai = transaksi
    .filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer' && t.tanggal.slice(0, 7) === bulanIni)
    .reduce((s, t) => s + t.jumlah, 0);
  const totalSisa = totalAnggaran - totalTerpakai;

  // Update kartu ringkasan
  const elAnggaran = document.getElementById('total-anggaran');
  const elSisa = document.getElementById('sisa-anggaran');
  if (elAnggaran) elAnggaran.textContent = formatRupiah(totalAnggaran);
  if (elSisa) {
    elSisa.textContent = formatRupiah(Math.abs(totalSisa));
    elSisa.style.color = totalSisa < 0 ? '#dc2626' : '#1e293b';
  }

  // Update tab anggaran
  const elAnggaranTab = document.getElementById('total-anggaran-tab');
  const elSisaTab = document.getElementById('sisa-anggaran-tab');
  if (elAnggaranTab) elAnggaranTab.textContent = formatRupiah(totalAnggaran);
  if (elSisaTab) {
    elSisaTab.textContent = formatRupiah(Math.abs(totalSisa));
    elSisaTab.style.color = totalSisa < 0 ? '#dc2626' : '#1e293b';
  }

  // Budget mini di ringkasan
  const budgetMini = document.getElementById('budget-mini');
  if (budgetMini) {
    if (keys.length === 0) {
      budgetMini.innerHTML = '<p style="font-size:13px;color:#94a3b8">Belum ada anggaran.</p>';
    } else {
      budgetMini.innerHTML = keys.map(kat => {
        const batas = budget[kat];
        const terpakai = transaksi
          .filter(t => t.tipe === 'keluar' && t.kategori === kat && t.tanggal.slice(0, 7) === bulanIni)
          .reduce((s, t) => s + t.jumlah, 0);
        const persen = Math.min((terpakai / batas) * 100, 100).toFixed(0);
        const warna = terpakai > batas ? '#ef4444' : persen >= 80 ? '#f59e0b' : '#10b981';
        return `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span style="font-weight:500">${kat}</span>
              <span style="color:#94a3b8">${formatRupiah(terpakai)} / ${formatRupiah(batas)}</span>
            </div>
            <div style="height:6px;background:#f1f5f9;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${persen}%;background:${warna};border-radius:4px;transition:width 0.4s"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Budget detail di tab anggaran
  const container = document.getElementById('budget-list');
  if (!container) return;
  if (keys.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:#aaa">Belum ada anggaran yang diset.</p>';
    return;
  }

  container.innerHTML = keys.map(kat => {
    const batas = budget[kat];
    const terpakai = transaksi
      .filter(t => t.tipe === 'keluar' && t.kategori === kat && t.tanggal.slice(0, 7) === bulanIni)
      .reduce((s, t) => s + t.jumlah, 0);
    const persen = Math.min((terpakai / batas) * 100, 100).toFixed(0);
    let kelas = '', status = '';
    if (terpakai > batas) { kelas = 'lewat'; status = `⚠️ Melebihi ${formatRupiah(terpakai - batas)}`; }
    else if (persen >= 80) { kelas = 'hampir'; status = `⚠️ Hampir batas (${persen}%)`; }
    else { status = `Sisa ${formatRupiah(batas - terpakai)}`; }
    return `
      <div class="budget-item">
        <div class="budget-header">
          <span>${kat} <button class="budget-hapus" onclick="hapusBudget('${kat}')">✕</button></span>
          <span class="budget-angka">${formatRupiah(terpakai)} / ${formatRupiah(batas)}</span>
        </div>
        <div class="budget-bar-track">
          <div class="budget-bar-fill ${kelas}" style="width:${persen}%"></div>
        </div>
        <div class="budget-status ${kelas}">${status}</div>
      </div>
    `;
  }).join('');
}

// ======= GRAFIK =======
function renderGrafikAll() {
  const sumber = transaksi;

  // Grafik kategori
  const dataKategori = {};
  sumber.filter(t => t.kategori !== 'Transfer').forEach(t => {
    if (!dataKategori[t.kategori]) dataKategori[t.kategori] = { masuk: 0, keluar: 0 };
    dataKategori[t.kategori][t.tipe] += t.jumlah;
  });
  const labels = Object.keys(dataKategori);
  if (grafikInstance) grafikInstance.destroy();
  if (labels.length > 0) {
    const ctx = document.getElementById('grafikKategori').getContext('2d');
    grafikInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Pemasukan', data: labels.map(k => dataKategori[k].masuk), backgroundColor: '#10b981', borderRadius: 6, borderSkipped: false },
          { label: 'Pengeluaran', data: labels.map(k => dataKategori[k].keluar), backgroundColor: '#ef4444', borderRadius: 6, borderSkipped: false }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true, position: 'top' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: Rp ${c.raw.toLocaleString('id-ID')}` } } },
        scales: { y: { ticks: { callback: v => 'Rp ' + v.toLocaleString('id-ID') } } }
      }
    });
  }

  // Grafik saldo per rekening
  const aktif = metodeList.filter(m => sumber.some(t => t.metode === m));
  const masukAktif = aktif.map(m => sumber.filter(t => t.tipe === 'masuk' && t.metode === m && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0));
  const keluarAktif = aktif.map(m => sumber.filter(t => t.tipe === 'keluar' && t.metode === m && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0));
  if (grafikSaldoInstance) grafikSaldoInstance.destroy();
  if (aktif.length > 0) {
    const ctx2 = document.getElementById('grafikSaldo').getContext('2d');
    grafikSaldoInstance = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: aktif,
        datasets: [
          { label: 'Pemasukan', data: masukAktif, backgroundColor: '#10b981', borderRadius: 6, borderSkipped: false },
          { label: 'Pengeluaran', data: keluarAktif, backgroundColor: '#ef4444', borderRadius: 6, borderSkipped: false }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true, position: 'top' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: Rp ${c.raw.toLocaleString('id-ID')}` } } },
        scales: { y: { ticks: { callback: v => 'Rp ' + v.toLocaleString('id-ID') } } }
      }
    });
  }
}

// ======= HUTANG PIUTANG =======
function setHPTab(tab, el) {
  hpTab = tab;
  document.querySelectorAll('.hp-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderHP();
}

function tambahHP() {
  const nama = document.getElementById('hp-nama').value.trim();
  const jumlah = parseFloat(document.getElementById('hp-jumlah').value);
  const tanggal = document.getElementById('hp-tanggal').value;
  const keterangan = document.getElementById('hp-keterangan').value.trim();
  if (!nama || !jumlah || jumlah <= 0 || !tanggal) { alert('Lengkapi nama, jumlah, dan tanggal!'); return; }
  push(hpRef, { nama, jumlah, tanggal, keterangan, tipe: hpTab, terbayar: 0 });
  document.getElementById('hp-nama').value = '';
  document.getElementById('hp-jumlah').value = '';
  document.getElementById('hp-keterangan').value = '';
}

function tandaiLunas(key) {
  if (!confirm('Hapus data ini?')) return;
  remove(ref(db, 'hutangpiutang/' + key));
}

function bukaCicilan(key, nama, sisa) {
  cicilanTargetKey = key;
  document.getElementById('cicilan-label').textContent = `Bayar ${hpTab === 'piutang' ? 'piutang' : 'hutang'} — ${nama} (Sisa: ${formatRupiah(sisa)})`;
  document.getElementById('cicilan-jumlah').value = '';
  document.getElementById('cicilan-keterangan').value = '';
  document.getElementById('cicilan-tanggal').valueAsDate = new Date();
  document.getElementById('form-cicilan').style.display = 'block';
}

function tutupCicilan() {
  cicilanTargetKey = null;
  document.getElementById('form-cicilan').style.display = 'none';
}

function simpanCicilan() {
  if (!cicilanTargetKey) return;
  const jumlah = parseFloat(document.getElementById('cicilan-jumlah').value);
  if (!jumlah || jumlah <= 0) { alert('Isi jumlah bayar!'); return; }
  const target = hpData.find(h => h._key === cicilanTargetKey);
  if (!target) return;
  const terbayarBaru = (target.terbayar || 0) + jumlah;
  set(ref(db, 'hutangpiutang/' + cicilanTargetKey + '/terbayar'), terbayarBaru);
  tutupCicilan();
}

function renderHP() {
  const container = document.getElementById('hp-list');
  const grafikContainer = document.getElementById('hp-grafik-list');
  const filtered = hpData.filter(h => h.tipe === hpTab);

  const totalPiutang = hpData.filter(h => h.tipe === 'piutang').reduce((s,h) => s + (h.jumlah - (h.terbayar || 0)), 0);
  const totalHutang = hpData.filter(h => h.tipe === 'hutang').reduce((s,h) => s + (h.jumlah - (h.terbayar || 0)), 0);
  const elP = document.getElementById('total-piutang');
  const elH = document.getElementById('total-hutang');
  if (elP) elP.textContent = formatRupiah(totalPiutang);
  if (elH) elH.textContent = formatRupiah(totalHutang);

  if (filtered.length === 0) {
    container.innerHTML = `<p style="font-size:13px;color:#aaa;text-align:center;padding:12px">Tidak ada ${hpTab === 'piutang' ? 'piutang' : 'hutang'}.</p>`;
    if (grafikContainer) grafikContainer.innerHTML = '';
    return;
  }

  const totalSisa = filtered.reduce((s, h) => s + (h.jumlah - (h.terbayar || 0)), 0);
  container.innerHTML = `<div style="font-size:13px;color:#94a3b8;margin-bottom:10px">Sisa: <strong style="color:${hpTab==='piutang'?'#16a34a':'#dc2626'}">${formatRupiah(totalSisa)}</strong></div>` +
    filtered.map(h => {
      const terbayar = h.terbayar || 0;
      const sisa = h.jumlah - terbayar;
      const persen = Math.min((terbayar / h.jumlah) * 100, 100).toFixed(0);
      const warna = hpTab === 'piutang' ? '#10b981' : '#ef4444';
      const tgl = new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const lunas = sisa <= 0;
      return `
        <div class="budget-item">
          <div class="budget-header">
            <span style="font-weight:500">${h.nama} ${lunas ? '✅' : ''}</span>
            <span class="budget-angka">${formatRupiah(terbayar)} / ${formatRupiah(h.jumlah)}</span>
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">${h.keterangan || ''} · ${tgl}</div>
          <div class="budget-bar-track">
            <div class="budget-bar-fill" style="width:${persen}%;background:${warna}"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
            <div class="budget-status">Sisa ${formatRupiah(sisa)} (${persen}% terbayar)</div>
            <div style="display:flex;gap:6px">
              ${!lunas ? `<button class="hp-lunas" onclick="bukaCicilan('${h._key}','${h.nama}',${sisa})">+ Bayar</button>` : ''}
              <button class="hp-lunas" onclick="tandaiLunas('${h._key}')" style="color:#dc2626;border-color:#dc2626">🗑 Hapus</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  if (grafikContainer) {
    grafikContainer.innerHTML = filtered.map(h => {
      const terbayar = h.terbayar || 0;
      const sisa = h.jumlah - terbayar;
      const persen = Math.min((terbayar / h.jumlah) * 100, 100).toFixed(0);
      const warna = hpTab === 'piutang' ? '#10b981' : '#ef4444';
      return `
        <div class="budget-item">
          <div class="budget-header">
            <span style="font-weight:500">${h.nama}</span>
            <span class="budget-angka">Sisa ${formatRupiah(sisa)}</span>
          </div>
          <div class="budget-bar-track">
            <div class="budget-bar-fill" style="width:${persen}%;background:${warna}"></div>
          </div>
          <div class="budget-status">${persen}% terbayar dari ${formatRupiah(h.jumlah)}</div>
        </div>
      `;
    }).join('');
  }
}

// ======= EXPORT =======
function exportExcel() {
  if (transaksi.length === 0) { alert('Belum ada data!'); return; }
  const data = transaksi.map(t => ({
    'Tanggal': t.tanggal, 'Keterangan': t.keterangan,
    'Jenis': t.tipe === 'masuk' ? 'Pemasukan' : t.tipe === 'transfer' ? 'Transfer' : 'Pengeluaran',
    'Kategori': t.kategori, 'Metode': t.metode, 'Jumlah (Rp)': t.jumlah
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
  ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
  XLSX.writeFile(wb, 'keuangan-keluarga.xlsx');
}

window.gotoTab = gotoTab;
window.setType = setType;
window.tambahTransaksi = tambahTransaksi;
window.hapus = hapus;
window.lakukanTransfer = lakukanTransfer;
window.simpanBudget = simpanBudget;
window.hapusBudget = hapusBudget;
window.setHPTab = setHPTab;
window.tambahHP = tambahHP;
window.tandaiLunas = tandaiLunas;
window.bukaCicilan = bukaCicilan;
window.tutupCicilan = tutupCicilan;
window.simpanCicilan = simpanCicilan;
window.exportExcel = exportExcel;
window.render = render;
