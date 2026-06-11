import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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
const auth = getAuth(app);

let transaksi = [];
let tipeAktif = 'masuk';
let grafikInstance = null;
let grafikSaldoInstance = null;
let grafikSaldoHarianInstance = null;
let grafikPengeluaranHarianInstance = null;
let grafikDonutInstance = null;
let budget = {};
let hpData = [];
let hpTab = 'piutang';
let filterType = 'semua';
let cicilanTargetKey = null;

const metodeList = ['Cash', 'BNI', 'BSI', 'DANA', 'OVO', 'SeaBank', 'GoPay'];

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
  renderInsight();
});

onValue(transaksiRef, (snapshot) => {
  transaksi = [];
  snapshot.forEach((child) => {
    transaksi.unshift({ _key: child.key, ...child.val() });
  });
  render();
  renderBudget();
  renderInsight();
  renderGrafikAll();
  renderGrafikSaldoHarian();
  renderGrafikPengeluaranHarian(); // ← tambahkan
  renderGrafikDonut();              // ← tambahkan
  renderRekeningList();             // ← tambahkan
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
function setFilterType(type, el) {
  filterType = type;
  document.querySelectorAll('.filter-type-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  document.getElementById('filter-bulan-wrap').style.display = 'none';
  document.getElementById('filter-rentang-wrap').style.display = 'none';
  document.getElementById('filter-tanggal-wrap').style.display = 'none';

  if (type === 'bulan') document.getElementById('filter-bulan-wrap').style.display = 'block';
  if (type === 'rentang') document.getElementById('filter-rentang-wrap').style.display = 'flex';
  if (type === 'tanggal') document.getElementById('filter-tanggal-wrap').style.display = 'block';

  render();
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
      <option value="Sekolah Anak">Sekolah Anak</option>
      <option value="Liburan">Liburan</option>
      <option value="Makan">Makan</option>
      <option value="Transport">Transport</option>
      <option value="BBM">BBM</option>
      <option value="Belanja">Belanja</option>
      <option value="Listrik">Listrik</option>
      <option value="Air">Air</option>
      <option value="Internet">Internet</option>
      <option value="Pulsa">Pulsa</option>
      <option value="Kesehatan">Kesehatan</option>
      <option value="Pajak">Pajak</option>
      <option value="Asuransi">Asuransi</option>
      <option value="Sedekah">Sedekah</option>
      <option value="Investasi">Investasi</option>
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
function editTransaksi(key) {
  const t = transaksi.find(t => t._key === key);
  if (!t) return;

  // Pindah ke tab transaksi
  document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
  document.getElementById('tab-transaksi').classList.add('active');
  document.querySelectorAll('.nav-tab')[1].classList.add('active');

  // Isi form dengan data yang ada
  setType(t.tipe === 'keluar' ? 'keluar' : 'masuk');
  document.getElementById('keterangan').value = t.keterangan;
  document.getElementById('jumlah').value = t.jumlah;
  document.getElementById('tanggal').value = t.tanggal;
  document.getElementById('metode').value = t.metode;

  // Tunggu kategori terisi lalu set nilainya
  setTimeout(() => {
    document.getElementById('kategori').value = t.kategori;
  }, 50);

  // Ganti tombol simpan jadi update
  const btn = document.getElementById('btn-simpan-transaksi');
  btn.textContent = '✏️ Update Transaksi';
  btn.onclick = () => updateTransaksi(key);

  document.getElementById('keterangan').scrollIntoView({ behavior: 'smooth' });
}

function updateTransaksi(key) {
  const keterangan = document.getElementById('keterangan').value.trim();
  const jumlah = parseFloat(document.getElementById('jumlah').value);
  const kategori = document.getElementById('kategori').value;
  const tanggal = document.getElementById('tanggal').value;
  const metode = document.getElementById('metode').value;

  if (!keterangan || !jumlah || jumlah <= 0 || !tanggal) {
    alert('Lengkapi semua kolom!');
    return;
  }

  const transaksiLama = transaksi.find(t => t._key === key);

set(ref(db, 'transaksi/' + key), {
  id: transaksiLama.id,
  tipe: tipeAktif,
  keterangan,
  jumlah,
  kategori,
  tanggal,
  metode
});

  // Reset tombol simpan
  const btn = document.getElementById('btn-simpan-transaksi');
  btn.textContent = '+ Simpan Transaksi';
  btn.onclick = tambahTransaksi;
  document.getElementById('keterangan').value = '';
  document.getElementById('jumlah').value = '';
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
      // Update dropdown bulan
  const semuaBulan = [...new Set(transaksi.map(t => t.tanggal.slice(0, 7)))].sort().reverse();
  const filterEl = document.getElementById('filter-bulan');
  const dipilih = filterEl ? filterEl.value : '';
  if (filterEl) {
    filterEl.innerHTML = '<option value="">Pilih Bulan</option>' +
      semuaBulan.map(b => {
        const [th, bl] = b.split('-');
        const label = new Date(th, bl - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        return `<option value="${b}" ${dipilih === b ? 'selected' : ''}>${label}</option>`;
      }).join('');
  }

  // Filter berdasarkan tipe
  let filtered = transaksi;
  if (filterType === 'bulan' && dipilih) {
    filtered = transaksi.filter(t => t.tanggal.slice(0, 7) === dipilih);
  } else if (filterType === 'rentang') {
    const dari = document.getElementById('filter-dari')?.value;
    const sampai = document.getElementById('filter-sampai')?.value;
    if (dari && sampai) {
      filtered = transaksi.filter(t => t.tanggal >= dari && t.tanggal <= sampai);
    } else if (dari) {
      filtered = transaksi.filter(t => t.tanggal >= dari);
    } else if (sampai) {
      filtered = transaksi.filter(t => t.tanggal <= sampai);
    }
  } else if (filterType === 'tanggal') {
    const tgl = document.getElementById('filter-tanggal-val')?.value;
    if (tgl) filtered = transaksi.filter(t => t.tanggal === tgl);
  }
  // Filter pencarian
  const cari = document.getElementById('filter-cari')?.value.toLowerCase().trim();
  if (cari) {
    filtered = filtered.filter(t =>
      t.keterangan.toLowerCase().includes(cari) ||
      t.kategori.toLowerCase().includes(cari) ||
      t.metode.toLowerCase().includes(cari)
    );
  }
  const now = new Date();
  const bulanIni = now.toISOString().slice(0, 7);
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

  // Rata-rata harian
  const hariDalamBulan = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avgMasuk = totalMasuk > 0 ? totalMasuk / now.getDate() : 0;
  const avgKeluar = totalKeluar > 0 ? totalKeluar / now.getDate() : 0;
  const elAvgMasuk = document.getElementById('avg-masuk');
  const elAvgKeluar = document.getElementById('avg-keluar');
  if (elAvgMasuk) elAvgMasuk.textContent = formatRupiah(avgMasuk);
  if (elAvgKeluar) elAvgKeluar.textContent = formatRupiah(avgKeluar);

  // Jumlah transaksi keluar
  const jmlKeluar = filteredBulanIni.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer').length;
  const elJmlKeluar = document.getElementById('jml-transaksi-keluar');
  if (elJmlKeluar) elJmlKeluar.textContent = `Total ${jmlKeluar} transaksi`;
  // Cashflow bersih & saving rate
  const cashflow = totalMasuk - totalKeluar;
  const savingRate = totalMasuk > 0 ? ((cashflow / totalMasuk) * 100).toFixed(1) : 0;

  const elCashflow = document.getElementById('cashflow-bersih');
  if (elCashflow) {
    elCashflow.textContent = formatRupiah(Math.abs(cashflow));
    elCashflow.style.color = cashflow < 0 ? '#dc2626' : '#16a34a';
  }

  const elSaving = document.getElementById('saving-rate');
  if (elSaving) {
    elSaving.textContent = savingRate + '%';
    elSaving.style.color = savingRate < 0 ? '#dc2626' : savingRate < 20 ? '#f59e0b' : '#6366f1';
  }

  const elSavingLabel = document.getElementById('saving-rate-label');
  const elSavingStatus = document.getElementById('saving-rate-status');
  if (elSavingLabel) {
    if (savingRate >= 50) { elSavingLabel.textContent = 'Sangat Baik ⭐'; elSavingLabel.className = 'kartu-stat-badge'; }
    else if (savingRate >= 20) { elSavingLabel.textContent = 'Baik 👍'; elSavingLabel.className = 'kartu-stat-badge'; }
    else if (savingRate >= 0) { elSavingLabel.textContent = 'Perlu Ditingkatkan'; elSavingLabel.className = 'kartu-stat-badge sedang'; }
    else { elSavingLabel.textContent = 'Defisit ⚠️'; elSavingLabel.className = 'kartu-stat-badge kurang'; }
  }
  if (elSavingStatus) {
    elSavingStatus.textContent = savingRate >= 20 ? 'Tercapai ✓' : 'Belum Tercapai';
    elSavingStatus.style.color = savingRate >= 20 ? '#16a34a' : '#dc2626';
  }

  // Saldo per rekening - hanya tampil yang ada transaksinya
  metodeList.forEach(m => {
    const kartu = document.getElementById('saldo-' + m);
    if (!kartu) return;
    const wrapper = kartu.closest('.card');
    const masuk = transaksi.filter(t => t.tipe === 'masuk' && t.metode === m).reduce((s,t) => s+t.jumlah, 0);
    const keluar = transaksi.filter(t => t.tipe === 'keluar' && t.metode === m).reduce((s,t) => s+t.jumlah, 0);
    const saldoM = masuk - keluar;
    if (masuk === 0 && keluar === 0) {
      if (wrapper) wrapper.style.display = 'none';
      return;
    }
    if (wrapper) wrapper.style.display = 'block';
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
          <button class="tx-edit" onclick="editTransaksi('${t._key}')">✏️</button>
        <button class="tx-hapus" onclick="hapus('${t._key}')">🗑</button>
        </li>
      `;
    }).join('');
  }

  renderMiniTransaksi();
  }

  function renderMiniTransaksi() {
  const mini = document.getElementById('list-transaksi-mini');
  const last5 = transaksi.slice(0, 5);

  if (last5.length === 0) {
    mini.innerHTML = '<li class="kosong">Belum ada transaksi.</li>';
  } else {
    const ikonKategori = {
      Gaji:'💼', Usaha:'🏪', Investasi:'📈', Piutang:'💰', Tabungan:'🏦', LAG:'🏠',
      Sembako:'🛒', Toiletris:'🧴', Pengasuh:'👶', 'Kebutuhan Anak':'🍼', Liburan:'✈️',
      Makan:'🍽️', Transport:'🚗', BBM:'⛽', Belanja:'🛍️', Listrik:'💡', Air:'💧',
      Internet:'📶', Pulsa:'📱', 'Sekolah Anak':'📚', Kesehatan:'❤️', Pajak:'📋',
      Asuransi:'🛡️', Sedekah:'🤲', Hiburan:'🎬', Pendidikan:'🎓', Hutang:'💸',
      Transfer:'↔️', Lainnya:'📦'
    };

    mini.innerHTML = last5.map(t => {
      const sign = t.tipe === 'masuk' ? '+' : '-';
      const color = t.tipe === 'masuk' ? '#16a34a' : '#dc2626';
      const bgColor = t.tipe === 'masuk' ? '#dcfce7' : '#fee2e2';
      const ikon = ikonKategori[t.kategori] || '📦';

      const tgl = new Date(t.tanggal).toLocaleDateString(
        'id-ID',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }
      );

      return `
        <li style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f8fafc">
          <div style="width:38px;height:38px;border-radius:10px;background:${bgColor};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${ikon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.keterangan}</div>
            <div style="font-size:11px;color:#94a3b8">${t.kategori} · ${t.metode} · ${tgl}</div>
          </div>
          <div style="font-size:13px;font-weight:600;color:${color};flex-shrink:0">${sign}${formatRupiah(t.jumlah)}</div>
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
function editBudget(kat, nominal) {
  document.getElementById('budget-kat').value = kat;
  document.getElementById('budget-nominal').value = nominal;

  // Pindah ke tab anggaran
  document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
  document.getElementById('tab-anggaran').classList.add('active');
  document.querySelectorAll('.nav-tab')[2].classList.add('active');

  // Ganti tombol jadi update
  const btn = document.getElementById('btn-simpan-budget');
  btn.textContent = '✏️ Update Anggaran';
  btn.onclick = () => updateBudget(kat);

  document.getElementById('budget-nominal').scrollIntoView({ behavior: 'smooth' });
}

function updateBudget(kat) {
  const nominal = parseFloat(document.getElementById('budget-nominal').value);
  if (!nominal || nominal <= 0) { alert('Isi nominal anggaran!'); return; }
  set(ref(db, 'budget/' + kat), nominal);

  // Reset tombol
  const btn = document.getElementById('btn-simpan-budget');
  btn.textContent = 'Set Anggaran';
  btn.onclick = simpanBudget;
  document.getElementById('budget-nominal').value = '';
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
          <span>${kat} <button class="budget-hapus" onclick="editBudget('${kat}',${batas})" style="color:#3b82f6;margin-right:2px">✏️</button><button class="budget-hapus" onclick="hapusBudget('${kat}')">✕</button></span>
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
function editHP(key) {
  const h = hpData.find(h => h._key === key);
  if (!h) return;

  // Pindah ke tab hutang piutang
  document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
  document.getElementById('tab-hutang').classList.add('active');
  document.querySelectorAll('.nav-tab')[3].classList.add('active');

  // Set tab yang sesuai
  hpTab = h.tipe;
  document.querySelectorAll('.hp-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.hp-tab')[h.tipe === 'piutang' ? 0 : 1].classList.add('active');

  // Isi form
  document.getElementById('hp-nama').value = h.nama;
  document.getElementById('hp-jumlah').value = h.jumlah;
  document.getElementById('hp-tanggal').value = h.tanggal;
  document.getElementById('hp-keterangan').value = h.keterangan || '';

  // Ganti tombol
  const btn = document.getElementById('btn-simpan-hp');
  btn.textContent = '✏️ Update';
  btn.onclick = () => updateHP(key);

  document.getElementById('hp-nama').scrollIntoView({ behavior: 'smooth' });
}

function updateHP(key) {
  const nama = document.getElementById('hp-nama').value.trim();
  const jumlah = parseFloat(document.getElementById('hp-jumlah').value);
  const tanggal = document.getElementById('hp-tanggal').value;
  const keterangan = document.getElementById('hp-keterangan').value.trim();

  if (!nama || !jumlah || jumlah <= 0 || !tanggal) { alert('Lengkapi semua kolom!'); return; }

  const target = hpData.find(h => h._key === key);
  set(ref(db, 'hutangpiutang/' + key), {
    nama, jumlah, tanggal, keterangan,
    tipe: hpTab,
    terbayar: target.terbayar || 0
  });

  // Reset tombol
  const btn = document.getElementById('btn-simpan-hp');
  btn.textContent = '+ Tambah';
  btn.onclick = tambahHP;
  document.getElementById('hp-nama').value = '';
  document.getElementById('hp-jumlah').value = '';
  document.getElementById('hp-keterangan').value = '';
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
              <button class="hp-lunas" onclick="editHP('${h._key}')">✏️ Edit</button>
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

// ======= TARGET KEUANGAN =======
const targetRef = ref(db, 'target');
let targetData = [];
let targetDanaKey = null;

onValue(targetRef, (snapshot) => {
  targetData = [];
  snapshot.forEach((child) => {
    targetData.unshift({ _key: child.key, ...child.val() });
  });
  renderTarget();
});

function tambahTarget() {
  const nama = document.getElementById('target-nama').value.trim();
  const jumlah = parseFloat(document.getElementById('target-jumlah').value);
  const emoji = document.getElementById('target-emoji').value.trim() || '🎯';
  const deadline = document.getElementById('target-deadline').value;

  if (!nama || !jumlah || jumlah <= 0) { alert('Isi nama dan jumlah target!'); return; }

  push(targetRef, { nama, jumlah, emoji, deadline: deadline || null, terkumpul: 0, createdAt: Date.now() });

  document.getElementById('target-nama').value = '';
  document.getElementById('target-jumlah').value = '';
  document.getElementById('target-emoji').value = '';
  document.getElementById('target-deadline').value = '';
}

function hapusTarget(key) {
  if (!confirm('Hapus target ini?')) return;
  remove(ref(db, 'target/' + key));
}
function editTarget(key) {
  const t = targetData.find(t => t._key === key);
  if (!t) return;

  // Pindah ke tab target
  document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('active'));
  document.getElementById('tab-target').classList.add('active');
  document.querySelectorAll('.nav-tab')[4].classList.add('active');

  // Isi form
  document.getElementById('target-nama').value = t.nama;
  document.getElementById('target-jumlah').value = t.jumlah;
  document.getElementById('target-emoji').value = t.emoji || '';
  document.getElementById('target-deadline').value = t.deadline || '';

  // Ganti tombol
  const btn = document.getElementById('btn-simpan-target');
  btn.textContent = '✏️ Update Target';
  btn.onclick = () => updateTarget(key);

  document.getElementById('target-nama').scrollIntoView({ behavior: 'smooth' });
}

function updateTarget(key) {
  const nama = document.getElementById('target-nama').value.trim();
  const jumlah = parseFloat(document.getElementById('target-jumlah').value);
  const emoji = document.getElementById('target-emoji').value.trim() || '🎯';
  const deadline = document.getElementById('target-deadline').value;

  if (!nama || !jumlah || jumlah <= 0) { alert('Isi nama dan jumlah target!'); return; }

  const target = targetData.find(t => t._key === key);
  set(ref(db, 'target/' + key), {
    nama, jumlah, emoji,
    deadline: deadline || null,
    terkumpul: target.terkumpul || 0,
    createdAt: target.createdAt
  });

  // Reset tombol
  const btn = document.getElementById('btn-simpan-target');
  btn.textContent = '+ Tambah Target';
  btn.onclick = tambahTarget;
  document.getElementById('target-nama').value = '';
  document.getElementById('target-jumlah').value = '';
  document.getElementById('target-emoji').value = '';
  document.getElementById('target-deadline').value = '';
}
function bukaDanaTarget(key, nama, sisa) {
  targetDanaKey = key;
  document.getElementById('target-dana-label').textContent = `Tambah dana untuk: ${nama} (Kurang: ${formatRupiah(sisa)})`;
  document.getElementById('target-dana-jumlah').value = '';
  document.getElementById('target-dana-tanggal').valueAsDate = new Date();
  document.getElementById('form-target-dana').style.display = 'block';
  document.getElementById('form-target-dana').scrollIntoView({ behavior: 'smooth' });
}

function tutupDanaTarget() {
  targetDanaKey = null;
  document.getElementById('form-target-dana').style.display = 'none';
}

function simpanDanaTarget() {
  if (!targetDanaKey) return;
  const jumlah = parseFloat(document.getElementById('target-dana-jumlah').value);
  if (!jumlah || jumlah <= 0) { alert('Isi jumlah dana!'); return; }

  const target = targetData.find(t => t._key === targetDanaKey);
  if (!target) return;

  const terkumpulBaru = (target.terkumpul || 0) + jumlah;
  set(ref(db, 'target/' + targetDanaKey + '/terkumpul'), terkumpulBaru);
  tutupDanaTarget();
}

function renderTarget() {
  const list = document.getElementById('target-list');
  const ringkasan = document.getElementById('target-ringkasan');
  if (!list) return;

  // Ringkasan
  const totalTarget = targetData.length;
  const tercapai = targetData.filter(t => (t.terkumpul || 0) >= t.jumlah).length;
  const totalDana = targetData.reduce((s, t) => s + (t.terkumpul || 0), 0);
  const totalDibutuhkan = targetData.reduce((s, t) => s + t.jumlah, 0);

  if (ringkasan) {
    ringkasan.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
        <span style="color:#94a3b8">Total target</span>
        <strong>${totalTarget} target</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
        <span style="color:#94a3b8">Sudah tercapai</span>
        <strong style="color:#16a34a">${tercapai} target ✅</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
        <span style="color:#94a3b8">Total terkumpul</span>
        <strong style="color:#6366f1">${formatRupiah(totalDana)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span style="color:#94a3b8">Total dibutuhkan</span>
        <strong>${formatRupiah(totalDibutuhkan)}</strong>
      </div>
    `;
  }

  if (targetData.length === 0) {
    list.innerHTML = '<p style="font-size:13px;color:#aaa;text-align:center;padding:20px">Belum ada target. Tambahkan target keuanganmu!</p>';
    return;
  }

  list.innerHTML = targetData.map(t => {
    const terkumpul = t.terkumpul || 0;
    const sisa = t.jumlah - terkumpul;
    const persen = Math.min((terkumpul / t.jumlah) * 100, 100).toFixed(1);
    const tercapai = sisa <= 0;
    const warna = tercapai ? '#16a34a' : persen >= 75 ? '#6366f1' : persen >= 40 ? '#f59e0b' : '#94a3b8';

    let deadlineInfo = '';
    if (t.deadline) {
      const tgl = new Date(t.deadline);
      const hari = Math.ceil((tgl - new Date()) / (1000 * 60 * 60 * 24));
      const tglFormat = tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      if (hari < 0) {
        deadlineInfo = `<span style="color:#dc2626;font-size:11px">⚠️ Deadline terlewat ${Math.abs(hari)} hari lalu</span>`;
      } else if (hari <= 30) {
        deadlineInfo = `<span style="color:#f59e0b;font-size:11px">⏰ ${hari} hari lagi (${tglFormat})</span>`;
      } else {
        deadlineInfo = `<span style="color:#94a3b8;font-size:11px">📅 ${tglFormat}</span>`;
      }
    }

    return `
      <div class="budget-item" style="background:white;border:1px solid #f1f5f9;border-radius:12px;padding:16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <span style="font-size:20px;margin-right:8px">${t.emoji}</span>
            <span style="font-size:15px;font-weight:600;color:#1e293b">${t.nama} ${tercapai ? '✅' : ''}</span>
          </div>
          <button class="budget-hapus" onclick="editTarget('${t._key}')" style="font-size:14px;color:#3b82f6">✏️</button>
          <button class="budget-hapus" onclick="hapusTarget('${t._key}')" style="font-size:14px">🗑</button>
        </div>
        ${deadlineInfo ? `<div style="margin-bottom:8px">${deadlineInfo}</div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:6px">
          <span>Terkumpul: <strong style="color:#1e293b">${formatRupiah(terkumpul)}</strong></span>
          <span>Target: <strong style="color:#1e293b">${formatRupiah(t.jumlah)}</strong></span>
        </div>
        <div class="budget-bar-track" style="height:10px">
          <div class="budget-bar-fill" style="width:${persen}%;background:${warna}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <span style="font-size:12px;color:${warna};font-weight:600">${persen}% tercapai</span>
          <div style="display:flex;gap:6px">
            ${!tercapai ? `
              <span style="font-size:12px;color:#94a3b8">Kurang ${formatRupiah(sisa)}</span>
              <button class="hp-lunas" onclick="bukaDanaTarget('${t._key}','${t.nama}',${sisa})">+ Tambah Dana</button>
            ` : `<span style="font-size:12px;color:#16a34a;font-weight:600">Target tercapai! 🎉</span>`}
          </div>
        </div>
      </div>
    `;
  }).join('');
}
// ======= INSIGHT OTOMATIS =======
function renderInsight() {
  const container = document.getElementById('insight-list');
  if (!container) return;

  const now = new Date();
  const bulanIni = now.toISOString().slice(0, 7);
  const bulanLalu = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const txBulanIni = transaksi.filter(t => t.tanggal.slice(0, 7) === bulanIni);
  const txBulanLalu = transaksi.filter(t => t.tanggal.slice(0, 7) === bulanLalu);

  const insights = [];

  // 1. Perbandingan total pengeluaran bulan ini vs bulan lalu
  const keluarIni = txBulanIni.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const keluarLalu = txBulanLalu.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  if (keluarLalu > 0) {
    const diff = ((keluarIni - keluarLalu) / keluarLalu * 100).toFixed(0);
    if (diff > 0) {
      insights.push({ icon: '⚠️', warna: '#f59e0b', teks: `Pengeluaran bulan ini meningkat <strong>${diff}%</strong> dibanding bulan lalu (${formatRupiah(keluarIni)} vs ${formatRupiah(keluarLalu)}).` });
    } else if (diff < 0) {
      insights.push({ icon: '✅', warna: '#16a34a', teks: `Pengeluaran bulan ini turun <strong>${Math.abs(diff)}%</strong> dibanding bulan lalu. Bagus!` });
    }
  }

  // 2. Perbandingan saving rate bulan ini vs bulan lalu
  const masukIni = txBulanIni.filter(t => t.tipe === 'masuk' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const masukLalu = txBulanLalu.filter(t => t.tipe === 'masuk' && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const savingIni = masukIni > 0 ? ((masukIni - keluarIni) / masukIni * 100).toFixed(1) : 0;
  const savingLalu = masukLalu > 0 ? ((masukLalu - keluarLalu) / masukLalu * 100).toFixed(1) : 0;
  if (savingLalu > 0 && savingIni > 0) {
    const diffSaving = (savingIni - savingLalu).toFixed(1);
    if (diffSaving > 0) {
      insights.push({ icon: '🎉', warna: '#16a34a', teks: `Bulan ini kamu berhasil menabung <strong>${diffSaving}%</strong> lebih banyak dari bulan lalu (saving rate ${savingIni}%).` });
    } else if (diffSaving < 0) {
      insights.push({ icon: '📉', warna: '#dc2626', teks: `Saving rate bulan ini turun <strong>${Math.abs(diffSaving)}%</strong> dibanding bulan lalu (${savingIni}% vs ${savingLalu}%).` });
    }
  }

  // 3. Kategori pengeluaran terbesar bulan ini
  const kategoriMap = {};
  txBulanIni.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer').forEach(t => {
    kategoriMap[t.kategori] = (kategoriMap[t.kategori] || 0) + t.jumlah;
  });
  const kategoriTerbesar = Object.entries(kategoriMap).sort((a,b) => b[1]-a[1])[0];
  if (kategoriTerbesar) {
    const persen = keluarIni > 0 ? ((kategoriTerbesar[1] / keluarIni) * 100).toFixed(0) : 0;
    insights.push({ icon: '📊', warna: '#6366f1', teks: `Pengeluaran terbesar bulan ini: <strong>${kategoriTerbesar[0]}</strong> sebesar ${formatRupiah(kategoriTerbesar[1])} (${persen}% dari total pengeluaran).` });
  }

  // 4. Perbandingan per kategori bulan ini vs bulan lalu
  const kategoriIni = {};
  const kategoriLaluMap = {};
  txBulanIni.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer').forEach(t => { kategoriIni[t.kategori] = (kategoriIni[t.kategori] || 0) + t.jumlah; });
  txBulanLalu.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer').forEach(t => { kategoriLaluMap[t.kategori] = (kategoriLaluMap[t.kategori] || 0) + t.jumlah; });

  Object.keys(kategoriIni).forEach(kat => {
    if (kategoriLaluMap[kat] && kategoriLaluMap[kat] > 0) {
      const naik = ((kategoriIni[kat] - kategoriLaluMap[kat]) / kategoriLaluMap[kat] * 100).toFixed(0);
      if (naik >= 25) {
        insights.push({ icon: '🔺', warna: '#ef4444', teks: `Pengeluaran <strong>${kat}</strong> meningkat <strong>${naik}%</strong> dibanding bulan lalu (${formatRupiah(kategoriIni[kat])} vs ${formatRupiah(kategoriLaluMap[kat])}).` });
      }
    }
  });

  // 5. Anggaran yang hampir habis
  const bulanIniBudget = new Date().toISOString().slice(0, 7);
  Object.keys(budget).forEach(kat => {
    const batas = budget[kat];
    const terpakai = transaksi
      .filter(t => t.tipe === 'keluar' && t.kategori === kat && t.tanggal.slice(0, 7) === bulanIniBudget)
      .reduce((s,t) => s+t.jumlah, 0);
    const persen = batas > 0 ? ((terpakai / batas) * 100).toFixed(0) : 0;
    if (persen >= 80 && persen < 100) {
      insights.push({ icon: '⚡', warna: '#f59e0b', teks: `Anggaran <strong>${kat}</strong> sudah terpakai <strong>${persen}%</strong> (${formatRupiah(terpakai)} dari ${formatRupiah(batas)}).` });
    } else if (persen >= 100) {
      insights.push({ icon: '🚨', warna: '#dc2626', teks: `Anggaran <strong>${kat}</strong> sudah <strong>melebihi batas!</strong> Terpakai ${formatRupiah(terpakai)} dari ${formatRupiah(batas)}.` });
    }
  });

  // 6. Target yang mendekati deadline
  targetData.forEach(t => {
    if (!t.deadline) return;
    const hari = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const persen = t.jumlah > 0 ? ((t.terkumpul || 0) / t.jumlah * 100).toFixed(0) : 0;
    if (hari > 0 && hari <= 30 && persen < 100) {
      insights.push({ icon: '⏰', warna: '#6366f1', teks: `Target <strong>${t.emoji} ${t.nama}</strong> deadline <strong>${hari} hari lagi</strong>, baru tercapai ${persen}%.` });
    } else if (hari < 0 && persen < 100) {
      insights.push({ icon: '❗', warna: '#dc2626', teks: `Target <strong>${t.emoji} ${t.nama}</strong> sudah melewati deadline dan baru tercapai ${persen}%.` });
    }
  });

  // 7. Hutang piutang yang besar
  const totalHutang = hpData.filter(h => h.tipe === 'hutang').reduce((s,h) => s + (h.jumlah - (h.terbayar||0)), 0);
  const totalPiutang = hpData.filter(h => h.tipe === 'piutang').reduce((s,h) => s + (h.jumlah - (h.terbayar||0)), 0);
  if (totalHutang > 0) {
    insights.push({ icon: '💸', warna: '#ef4444', teks: `Kamu masih punya hutang sebesar <strong>${formatRupiah(totalHutang)}</strong> yang belum lunas.` });
  }
  if (totalPiutang > 0) {
    insights.push({ icon: '💰', warna: '#16a34a', teks: `Ada piutang sebesar <strong>${formatRupiah(totalPiutang)}</strong> yang belum dibayar orang lain ke kamu.` });
  }

  // Tampilkan
  if (insights.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:#94a3b8;text-align:center;padding:12px">Belum ada insight. Tambahkan lebih banyak transaksi!</p>';
    return;
  }

  container.innerHTML = insights.map(i => `
    <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:#f8fafc;border-radius:10px;margin-bottom:8px;border-left:3px solid ${i.warna}">
      <span style="font-size:18px;flex-shrink:0">${i.icon}</span>
      <p style="font-size:13px;color:#1e293b;line-height:1.5">${i.teks}</p>
    </div>
  `).join('');
}
// ======= GRAFIK SALDO HARIAN =======
function renderGrafikSaldoHarian() {
  const ctx = document.getElementById('grafikSaldoHarian');
  if (!ctx) return;

  // Ambil 30 hari terakhir
  const hari30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    hari30.push(d.toISOString().slice(0, 10));
  }

  // Hitung saldo kumulatif per hari
  let saldoKumulatif = 0;
  const allSorted = [...transaksi].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  // Hitung saldo sebelum 30 hari lalu
  const batas = hari30[0];
  allSorted.filter(t => t.tanggal < batas && t.kategori !== 'Transfer').forEach(t => {
    saldoKumulatif += t.tipe === 'masuk' ? t.jumlah : -t.jumlah;
  });

  // Hitung saldo per hari dalam 30 hari
  const saldoPerHari = hari30.map(tgl => {
    allSorted.filter(t => t.tanggal === tgl && t.kategori !== 'Transfer').forEach(t => {
      saldoKumulatif += t.tipe === 'masuk' ? t.jumlah : -t.jumlah;
    });
    return saldoKumulatif;
  });

  // Hitung perbandingan saldo bulan ini vs bulan lalu
  const bulanIni = new Date().toISOString().slice(0, 7);
  const bulanLalu = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7);

  const masukIni = transaksi.filter(t => t.tipe === 'masuk' && t.tanggal.slice(0,7) === bulanIni && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const keluarIni = transaksi.filter(t => t.tipe === 'keluar' && t.tanggal.slice(0,7) === bulanIni && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const masukLalu = transaksi.filter(t => t.tipe === 'masuk' && t.tanggal.slice(0,7) === bulanLalu && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const keluarLalu = transaksi.filter(t => t.tipe === 'keluar' && t.tanggal.slice(0,7) === bulanLalu && t.kategori !== 'Transfer').reduce((s,t) => s+t.jumlah, 0);
  const cashflowIni = masukIni - keluarIni;
  const cashflowLalu = masukLalu - keluarLalu;
  const diffNominal = cashflowIni - cashflowLalu;
  const diffPersen = cashflowLalu !== 0 ? ((diffNominal / Math.abs(cashflowLalu)) * 100).toFixed(1) : 0;

  // Update hero perbandingan
  const elDiff = document.getElementById('saldo-diff');
  const elPersen = document.getElementById('saldo-diff-persen');
  const elIcon = document.getElementById('saldo-diff-icon');
  if (elDiff && elPersen && elIcon) {
    const naik = diffNominal >= 0;
    elDiff.textContent = (naik ? '+ ' : '- ') + formatRupiah(Math.abs(diffNominal));
    elDiff.style.color = naik ? '#16a34a' : '#dc2626';
    elIcon.textContent = naik ? '↑' : '↓';
    elIcon.style.color = naik ? '#16a34a' : '#dc2626';
    elPersen.textContent = (naik ? '+' : '') + diffPersen + '%';
    elPersen.className = 'hero-badge' + (naik ? '' : ' turun');
  }

  // Render grafik
  if (grafikSaldoHarianInstance) grafikSaldoHarianInstance.destroy();

  const labels = hari30.map(tgl => {
    const d = new Date(tgl);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  });

  grafikSaldoHarianInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: saldoPerHari,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: c => ' ' + formatRupiah(c.raw) }
      }},
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 6 } },
        y: { grid: { color: '#f1f5f9' }, ticks: {
          font: { size: 10 },
          callback: v => v >= 1000000 ? (v/1000000).toFixed(1) + ' jt' : v >= 1000 ? (v/1000).toFixed(0) + ' rb' : v
        }}
      }
    }
  });
}
// ======= GRAFIK PENGELUARAN HARIAN =======
function renderGrafikPengeluaranHarian() {
  const ctx = document.getElementById('grafikPengeluaranHarian');
  if (!ctx) return;

  const hari30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    hari30.push(d.toISOString().slice(0, 10));
  }

  const dataPerHari = hari30.map(tgl =>
    transaksi.filter(t => t.tanggal === tgl && t.tipe === 'keluar' && t.kategori !== 'Transfer')
      .reduce((s,t) => s+t.jumlah, 0)
  );

  const labels = hari30.map(tgl => {
    const d = new Date(tgl);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  });

  if (grafikPengeluaranHarianInstance) grafikPengeluaranHarianInstance.destroy();

  grafikPengeluaranHarianInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: dataPerHari,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#6366f1',
        pointHoverRadius: 5,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' ' + formatRupiah(c.raw) } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
        y: { grid: { color: '#f8fafc' }, ticks: {
          font: { size: 10 },
          callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+'jt' : v >= 1000 ? (v/1000).toFixed(0)+'rb' : v
        }}
      }
    }
  });
}

// ======= GRAFIK DONUT =======
function renderGrafikDonut() {
  const ctx = document.getElementById('grafikDonut');
  const legend = document.getElementById('donut-legend');
  if (!ctx) return;

  const bulanIni = new Date().toISOString().slice(0, 7);
  const txBulanIni = transaksi.filter(t => t.tipe === 'keluar' && t.kategori !== 'Transfer' && t.tanggal.slice(0,7) === bulanIni);
  const total = txBulanIni.reduce((s,t) => s+t.jumlah, 0);

  const kategoriMap = {};
  txBulanIni.forEach(t => { kategoriMap[t.kategori] = (kategoriMap[t.kategori]||0) + t.jumlah; });
  const sorted = Object.entries(kategoriMap).sort((a,b) => b[1]-a[1]);

  if (sorted.length === 0) return;

  // Kelompokkan kategori kecil jadi "Lainnya"
  const top5 = sorted.slice(0, 5);
  const lainnya = sorted.slice(5).reduce((s,x) => s+x[1], 0);
  if (lainnya > 0) top5.push(['Lainnya', lainnya]);

  const warna = ['#10b981','#6366f1','#f59e0b','#ec4899','#3b82f6','#94a3b8'];

  if (grafikDonutInstance) grafikDonutInstance.destroy();

  grafikDonutInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: top5.map(x=>x[0]),
      datasets: [{
        data: top5.map(x=>x[1]),
        backgroundColor: warna,
        borderWidth: 2,
        borderColor: 'white'
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${formatRupiah(c.raw)}` } }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { width, height, ctx } = chart;
        ctx.save();
        ctx.font = `bold ${Math.min(width,height)*0.1}px Inter`;
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Total', width/2, height/2 - 10);
        ctx.font = `bold ${Math.min(width,height)*0.09}px Inter`;
        ctx.fillStyle = '#6366f1';
        const totalStr = total >= 1000000 ? 'Rp '+(total/1000000).toFixed(1)+'jt' : formatRupiah(total);
        ctx.fillText(totalStr, width/2, height/2 + 12);
        ctx.restore();
      }
    }]
  });

  // Legend
  if (legend) {
    legend.innerHTML = top5.map((x,i) => {
      const persen = total > 0 ? ((x[1]/total)*100).toFixed(0) : 0;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:10px;height:10px;border-radius:50%;background:${warna[i]};flex-shrink:0"></div>
            <span style="color:#475569">${x[0]}</span>
          </div>
          <div style="text-align:right">
            <span style="font-weight:600;color:#1e293b">${persen}%</span>
            <div style="color:#94a3b8;font-size:11px">${formatRupiah(x[1])}</div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ======= REKENING LIST =======
function renderRekeningList() {
  const container = document.getElementById('rekening-list');
  const elTotal = document.getElementById('total-saldo-rekening');
  if (!container) return;

  let totalSaldo = 0;
  const rekeningAktif = [];

  metodeList.forEach(m => {
    const masuk = transaksi.filter(t => t.tipe === 'masuk' && t.metode === m).reduce((s,t) => s+t.jumlah, 0);
    const keluar = transaksi.filter(t => t.tipe === 'keluar' && t.metode === m).reduce((s,t) => s+t.jumlah, 0);
    const saldo = masuk - keluar;
    if (masuk > 0 || keluar > 0) {
      rekeningAktif.push({ nama: m, saldo });
      totalSaldo += saldo;
    }
  });

  if (elTotal) elTotal.textContent = formatRupiah(totalSaldo);

  if (rekeningAktif.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:#94a3b8;text-align:center;padding:12px">Belum ada rekening.</p>';
    return;
  }

  const ikonRekening = { Cash: '💵', BNI: '🏦', BSI: '🏦', DANA: '💙', OVO: '💜', SeaBank: '🌊', GoPay: '💚' };

  container.innerHTML = rekeningAktif.map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:18px">${ikonRekening[r.nama]||'🏦'}</div>
        <span style="font-size:13px;font-weight:500;color:#1e293b">${r.nama}</span>
      </div>
      <span style="font-size:13px;font-weight:600;color:${r.saldo < 0 ? '#dc2626' : '#1e293b'}">${r.saldo < 0 ? '-' : ''}${formatRupiah(Math.abs(r.saldo))}</span>
    </div>
  `).join('');
}
// ======= AUTH =======
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Sudah login — tampilkan aplikasi
    document.getElementById('halaman-login').style.display = 'none';
    document.getElementById('aplikasi-utama').style.display = 'block';
  } else {
    // Belum login — tampilkan halaman login
    document.getElementById('halaman-login').style.display = 'flex';
    document.getElementById('aplikasi-utama').style.display = 'none';
  }
});

function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btnLogin = document.getElementById('btn-login');

  if (!email || !password) {
    errEl.style.display = 'block';
    errEl.textContent = 'Isi email dan password terlebih dahulu!';
    return;
  }

  btnLogin.textContent = 'Memuat...';
  btnLogin.disabled = true;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      errEl.style.display = 'none';
    })
    .catch((error) => {
      btnLogin.textContent = 'Masuk';
      btnLogin.disabled = false;
      errEl.style.display = 'block';
      if (error.code === 'auth/invalid-credential') {
        errEl.textContent = 'Email atau password salah!';
      } else if (error.code === 'auth/too-many-requests') {
        errEl.textContent = 'Terlalu banyak percobaan. Coba lagi nanti.';
      } else {
        errEl.textContent = 'Gagal masuk. Coba lagi.';
      }
    });
}

function logoutUser() {
  if (!confirm('Yakin mau keluar?')) return;
  signOut(auth);
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
window.editTransaksi = editTransaksi;
window.render = render;
window.setFilterType = setFilterType;
window.tambahTarget = tambahTarget;
window.editBudget = editBudget;
window.hapusTarget = hapusTarget;
window.bukaDanaTarget = bukaDanaTarget;
window.tutupDanaTarget = tutupDanaTarget;
window.simpanDanaTarget = simpanDanaTarget;
window.editHP = editHP;
window.editTarget = editTarget;
window.updateTarget = updateTarget;
window.editHP = editHP;
window.updateHP = updateHP;
window.editBudget = editBudget;
window.editTransaksi = editTransaksi;
window.renderInsight = renderInsight;
window.renderGrafikSaldoHarian = renderGrafikSaldoHarian;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
