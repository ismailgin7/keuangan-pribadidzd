// ======= FIREBASE SETUP =======
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

let transaksi = [];
let tipeAktif = 'masuk';
let grafikInstance = null;
let grafikSaldoInstance = null;
let budget = {};

document.getElementById('tanggal').valueAsDate = new Date();

onValue(transaksiRef, (snapshot) => {
  transaksi = [];
  snapshot.forEach((child) => {
    transaksi.unshift({ _key: child.key, ...child.val() });
  });
  render();
});

onValue(budgetRef, (snapshot) => {
  budget = snapshot.val() || {};
  renderBudget();
});

function setType(tipe) {
  tipeAktif = tipe;
  document.getElementById('btn-masuk').className = '';
  document.getElementById('btn-keluar').className = '';
  document.getElementById('btn-transfer').className = '';
  document.getElementById('form-transfer').style.display = 'none';
  document.getElementById('form-grid-utama').style.display = 'grid';
  document.getElementById('btn-simpan-utama').style.display = 'block';

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
    document.getElementById('form-grid-utama').style.display = 'none';
    document.getElementById('btn-simpan-utama').style.display = 'none';
    document.getElementById('form-transfer').style.display = 'block';
    document.getElementById('transfer-tanggal').valueAsDate = new Date();
  }
}

function formatRupiah(angka) {
  return 'Rp ' + Math.round(angka).toLocaleString('id-ID');
}

function tambahTransaksi() {
  const keterangan = document.getElementById('keterangan').value.trim();
  const jumlah = parseFloat(document.getElementById('jumlah').value);
  const kategori = document.getElementById('kategori').value;
  const tanggal = document.getElementById('tanggal').value;
  const metode = document.getElementById('metode').value;

  if (!keterangan || !jumlah || jumlah <= 0 || !tanggal) {
    alert('Lengkapi semua kolom terlebih dahulu!');
    return;
  }

  push(transaksiRef, {
    id: Date.now(),
    tipe: tipeAktif,
    keterangan,
    jumlah,
    kategori,
    tanggal,
    metode
  });

  document.getElementById('keterangan').value = '';
  document.getElementById('jumlah').value = '';
}

function hapus(key) {
  if (!confirm('Hapus transaksi ini?')) return;
  remove(ref(db, 'transaksi/' + key));
}

function render() {
  const semuaBulan = [...new Set(transaksi.map(t => t.tanggal.slice(0, 7)))].sort().reverse();
  const filterEl = document.getElementById('filter-bulan');
  const dipilih = filterEl.value;

  filterEl.innerHTML = '<option value="">Semua Bulan</option>' +
    semuaBulan.map(b => {
      const [th, bl] = b.split('-');
      const label = new Date(th, bl - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      return `<option value="${b}" ${dipilih === b ? 'selected' : ''}>${label}</option>`;
    }).join('');

  const filtered = dipilih
    ? transaksi.filter(t => t.tanggal.slice(0, 7) === dipilih)
    : transaksi;

  const totalMasuk = filtered.filter(t => t.tipe === 'masuk' && t.kategori !== 'Transfer').reduce((sum, t) => sum + t.jumlah, 0);
  const totalKeluar = filtered.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer').reduce((sum, t) => sum + t.jumlah, 0);
  const saldo = totalMasuk - totalKeluar;

  document.getElementById('total-masuk').textContent = formatRupiah(totalMasuk);
  document.getElementById('total-keluar').textContent = formatRupiah(totalKeluar);

  const elSaldo = document.getElementById('saldo');
  elSaldo.textContent = formatRupiah(Math.abs(saldo));
  elSaldo.style.color = saldo < 0 ? '#dc2626' : '#111';

  const masukBank = filtered.filter(t => t.tipe === 'masuk' && t.metode !== 'Cash' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const keluarBank = filtered.filter(t => t.tipe === 'keluar' && t.metode !== 'Cash' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const saldoBank = masukBank - keluarBank;
  const elBank = document.getElementById('saldo-bank');
  elBank.textContent = formatRupiah(Math.abs(saldoBank));
  elBank.style.color = saldoBank < 0 ? '#dc2626' : '#1e293b';

  const masukCash = filtered.filter(t => t.tipe === 'masuk' && t.metode === 'Cash').reduce((s,t) => s+t.jumlah, 0);
  const keluarCash = filtered.filter(t => t.tipe === 'keluar' && t.metode === 'Cash' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const saldoCash = masukCash - keluarCash;
  const elCash = document.getElementById('saldo-cash');
  elCash.textContent = formatRupiah(Math.abs(saldoCash));
  elCash.style.color = saldoCash < 0 ? '#dc2626' : '#1e293b';

  const list = document.getElementById('list-transaksi');

  if (filtered.length === 0) {
    list.innerHTML = '<li class="kosong">Tidak ada transaksi.</li>';
    renderGrafik(filtered);
    renderGrafikSaldo(filtered);
    return;
  }

  list.innerHTML = filtered.map(t => {
    const tgl = new Date(t.tanggal).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const sign = t.tipe === 'masuk' ? '+' : t.tipe === 'transfer' ? '↔' : '-';
    return `
      <li>
        <div class="tx-info">
          <div class="tx-nama">${t.keterangan}</div>
          <div class="tx-meta">${t.kategori} · ${t.metode} · ${tgl}</div>
        </div>
        <div class="tx-nominal ${t.tipe}">
          ${sign}${formatRupiah(t.jumlah)}
        </div>
        <button class="tx-hapus" onclick="hapus('${t._key}')">🗑</button>
      </li>
    `;
  }).join('');

  renderGrafik(filtered);
  renderGrafikSaldo(filtered);
}

function renderGrafik(data) {
  const sumber = data || transaksi;
  const dataKategori = {};
  sumber.forEach(t => {
    if (!dataKategori[t.kategori]) dataKategori[t.kategori] = { masuk: 0, keluar: 0 };
    dataKategori[t.kategori][t.tipe] += t.jumlah;
  });

  const labels = Object.keys(dataKategori);
  const nilaiMasuk = labels.map(k => dataKategori[k].masuk);
  const nilaiKeluar = labels.map(k => dataKategori[k].keluar);

  if (grafikInstance) grafikInstance.destroy();
  if (labels.length === 0) return;

  const ctx = document.getElementById('grafikKategori').getContext('2d');
  grafikInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Pemasukan', data: nilaiMasuk, backgroundColor: '#10b981', borderRadius: 6, borderSkipped: false },
        { label: 'Pengeluaran', data: nilaiKeluar, backgroundColor: '#ef4444', borderRadius: 6, borderSkipped: false }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: Rp ${ctx.raw.toLocaleString('id-ID')}` } }
      },
      scales: { y: { ticks: { callback: v => 'Rp ' + v.toLocaleString('id-ID') } } }
    }
  });
}

function renderGrafikSaldo(data) {
  const sumber = data || transaksi;
  const metodeList = ['Cash', 'BNI', 'BSI', 'DANA', 'OVO', 'SeaBank', 'GoPay'];
  const aktif = metodeList.filter(m =>
    sumber.some(t => t.metode === m)
  );
  const masukAktif = aktif.map(m =>
    sumber.filter(t => t.tipe === 'masuk' && t.metode === m).reduce((s,t) => s+t.jumlah, 0)
  );
  const keluarAktif = aktif.map(m =>
    sumber.filter(t => t.tipe === 'keluar' && t.metode === m).reduce((s,t) => s+t.jumlah, 0)
  );

  if (grafikSaldoInstance) grafikSaldoInstance.destroy();
  if (aktif.length === 0) return;

  const ctx = document.getElementById('grafikSaldo').getContext('2d');
  grafikSaldoInstance = new Chart(ctx, {
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
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: Rp ${ctx.raw.toLocaleString('id-ID')}` } }
      },
      scales: { y: { ticks: { callback: v => 'Rp ' + v.toLocaleString('id-ID') } } }
    }
  });
}

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
  const container = document.getElementById('budget-list');
  const keys = Object.keys(budget);
  const totalAnggaran = Object.values(budget).reduce((sum, val) => sum + val, 0);
  const bulanIni = new Date().toISOString().slice(0, 7);
  const totalTerpakai = transaksi
    .filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer' && t.tanggal.slice(0, 7) === bulanIni)
    .reduce((sum, t) => sum + t.jumlah, 0);
  const totalSisaAnggaran = totalAnggaran - totalTerpakai;
  const elAnggaran = document.getElementById('total-anggaran');
  if (elAnggaran) elAnggaran.textContent = formatRupiah(totalAnggaran);

  const bulanIni = new Date().toISOString().slice(0, 7);
  const totalTerpakai = transaksi
    .filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer' && t.tanggal.slice(0, 7) === bulanIni)
    .reduce((sum, t) => sum + t.jumlah, 0);
  const totalSisa = totalAnggaran - totalTerpakai;
  const elSisa = document.getElementById('sisa-anggaran');
  if (elSisa) {
    elSisa.textContent = formatRupiah(Math.abs(totalSisa));
    elSisa.style.color = totalSisa < 0 ? '#dc2626' : '#1e293b';
  }

  if (keys.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:#aaa;margin-bottom:8px">Belum ada anggaran yang diset.</p>';
    return;
  }

  container.innerHTML = keys.map(kat => {
    const batas = budget[kat];
    const bulanIni = new Date().toISOString().slice(0, 7);
    const terpakai = transaksi
      .filter(t => t.tipe === 'keluar' && t.kategori === kat && t.tanggal.slice(0, 7) === bulanIni)
      .reduce((sum, t) => sum + t.jumlah, 0);

    const persen = Math.min((terpakai / batas) * 100, 100).toFixed(0);
    let status = '', kelas = '';

    if (terpakai > batas) {
      kelas = 'lewat';
      status = `⚠️ Melebihi anggaran sebesar ${formatRupiah(terpakai - batas)}!`;
    } else if (persen >= 80) {
      kelas = 'hampir';
      status = `⚠️ Hampir mencapai batas anggaran (${persen}%)`;
    } else {
      status = `Sisa ${formatRupiah(batas - terpakai)}`;
    }

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

function exportExcel() {
  if (transaksi.length === 0) { alert('Belum ada data untuk diekspor!'); return; }
  const data = transaksi.map(t => ({
    'Tanggal': t.tanggal,
    'Keterangan': t.keterangan,
    'Jenis': t.tipe === 'masuk' ? 'Pemasukan' : t.tipe === 'transfer' ? 'Transfer' : 'Pengeluaran',
    'Kategori': t.kategori,
    'Metode': t.metode,
    'Jumlah (Rp)': t.jumlah
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
  ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
  XLSX.writeFile(wb, 'keuangan-keluarga.xlsx');
}

function lakukanTransfer() {
  const dari = document.getElementById('transfer-dari').value;
  const ke = document.getElementById('transfer-ke').value;
  const jumlah = parseFloat(document.getElementById('transfer-jumlah').value);
  const tanggal = document.getElementById('transfer-tanggal').value;

  if (dari === ke) { alert('Akun asal dan tujuan tidak boleh sama!'); return; }
  if (!jumlah || jumlah <= 0) { alert('Isi jumlah transfer!'); return; }
  if (!tanggal) { alert('Isi tanggal transfer!'); return; }

  push(transaksiRef, {
    id: Date.now(),
    tipe: 'keluar',
    keterangan: `Transfer ke ${ke}`,
    jumlah,
    kategori: 'Transfer',
    tanggal,
    metode: dari
  });

  push(transaksiRef, {
    id: Date.now() + 1,
    tipe: 'masuk',
    keterangan: `Transfer dari ${dari}`,
    jumlah,
    kategori: 'Transfer',
    tanggal,
    metode: ke
  });

  document.getElementById('transfer-jumlah').value = '';
  alert(`Transfer ${formatRupiah(jumlah)} dari ${dari} ke ${ke} berhasil!`);
}
// ======= HUTANG PIUTANG =======
const hpRef = ref(db, 'hutangpiutang');
let hpData = [];
let hpTab = 'piutang';
let grafikHPInstance = null;

onValue(hpRef, (snapshot) => {
  hpData = [];
  snapshot.forEach((child) => {
    hpData.unshift({ _key: child.key, ...child.val() });
  });
  renderHP();
});

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

  if (!nama || !jumlah || jumlah <= 0 || !tanggal) {
    alert('Lengkapi nama, jumlah, dan tanggal!');
    return;
  }

  push(hpRef, { nama, jumlah, tanggal, keterangan, tipe: hpTab, lunas: false });

  document.getElementById('hp-nama').value = '';
  document.getElementById('hp-jumlah').value = '';
  document.getElementById('hp-keterangan').value = '';
}

function tandaiLunas(key) {
  if (!confirm('Tandai sebagai lunas dan hapus?')) return;
  remove(ref(db, 'hutangpiutang/' + key));
}

function renderHP() {
  const container = document.getElementById('hp-list');
  const filtered = hpData.filter(h => h.tipe === hpTab);

  if (filtered.length === 0) {
    container.innerHTML = `<p style="font-size:13px;color:#aaa;text-align:center;padding:12px">Tidak ada ${hpTab === 'piutang' ? 'piutang' : 'hutang'}.</p>`;
    renderGrafikHP();
    return;
  }

  const total = filtered.reduce((s, h) => s + h.jumlah, 0);

  container.innerHTML = `
    <div style="font-size:13px;color:#94a3b8;margin-bottom:10px">
      Total ${hpTab === 'piutang' ? 'piutang' : 'hutang'}: 
      <strong style="color:${hpTab === 'piutang' ? '#16a34a' : '#dc2626'}">${formatRupiah(total)}</strong>
    </div>
  ` + filtered.map(h => {
    const tgl = new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      <div class="hp-item">
        <div class="hp-info">
          <div class="hp-nama-text">${h.nama}</div>
          <div class="hp-meta">${h.keterangan || '-'} · ${tgl}</div>
        </div>
        <div class="hp-jumlah ${h.tipe}">${formatRupiah(h.jumlah)}</div>
        <button class="hp-lunas" onclick="tandaiLunas('${h._key}')">✓ Lunas</button>
      </div>
    `;
  }).join('');

  renderGrafikHP();
}

function renderGrafikHP() {
  const piutangTotal = hpData.filter(h => h.tipe === 'piutang').reduce((s,h) => s+h.jumlah, 0);
  const hutangTotal = hpData.filter(h => h.tipe === 'hutang').reduce((s,h) => s+h.jumlah, 0);

  if (grafikHPInstance) grafikHPInstance.destroy();
  if (piutangTotal === 0 && hutangTotal === 0) return;

  const ctx = document.getElementById('grafikHP').getContext('2d');
  grafikHPInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Piutang', 'Hutang'],
      datasets: [{
        data: [piutangTotal, hutangTotal],
        backgroundColor: ['#10b981', '#ef4444'],
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` Rp ${ctx.raw.toLocaleString('id-ID')}` } }
      },
      scales: { y: { ticks: { callback: v => 'Rp ' + v.toLocaleString('id-ID') } } }
    }
  });
}
window.setType = setType;
window.tambahTransaksi = tambahTransaksi;
window.hapus = hapus;
window.simpanBudget = simpanBudget;
window.hapusBudget = hapusBudget;
window.exportExcel = exportExcel;
window.render = render;
window.lakukanTransfer = lakukanTransfer; 
window.setHPTab = setHPTab;
window.tambahHP = tambahHP;
window.tandaiLunas = tandaiLunas;
