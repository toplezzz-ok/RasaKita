import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getDatabase, ref, onValue, get, set, push, update, remove, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = (s) => document.querySelector(s);
const money = (n) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);

const demoProducts = [
  {
    id: "nasi-goreng",
    name: "Nasi Goreng Spesial",
    category: "Makanan",
    price: 22000,
    stock: 20,
    image: "./images/nasigorengmenu.png",
    description: "Nasi goreng gurih dengan telur dan topping pilihan."
  },
  {
    id: "ayam-bakar",
    name: "Ayam Bakar",
    category: "Makanan",
    price: 20000,
    stock: 18,
    image: "./images/ayambakar.png",
    description: "Ayam bakar berbumbu dengan cita rasa gurih manis."
  },
  {
    id: "mie-ayam",
    name: "Mie Ayam",
    category: "Makanan",
    price: 18000,
    stock: 20,
    image: "./images/mieayam.png",
    description: "Mie ayam hangat dengan topping ayam dan sayuran."
  },
  {
    id: "gurami-bakar",
    name: "Gurami Bakar",
    category: "Makanan",
    price: 35000,
    stock: 10,
    image: "./images/guramibakar.png",
    description: "Gurami bakar dengan sambal dan lalapan."
  },
  {
    id: "nila-bakar",
    name: "Nila Bakar",
    category: "Makanan",
    price: 30000,
    stock: 12,
    image: "./images/nilabakar.png",
    description: "Ikan nila bakar berbumbu dengan lalapan segar."
  },
  {
    id: "bakso",
    name: "Bakso",
    category: "Makanan",
    price: 10000,
    stock: 20,
    image: "./images/bakso.png",
    description: "Bakso hangat dengan kuah gurih."
  },
  {
    id: "nasi-putih",
    name: "Nasi Putih",
    category: "Makanan",
    price: 4000,
    stock: 30,
    image: "./images/nasiputih.png",
    description: "Nasi putih hangat sebagai pelengkap hidangan."
  },
  {
    id: "es-teh",
    name: "Es Teh Nusantara",
    category: "Minuman",
    price: 6000,
    stock: 40,
    image: "./images/esteh.png",
    description: "Es teh segar untuk menemani waktu makan."
  },
  {
    id: "lemon-tea",
    name: "Lemon Tea",
    category: "Minuman",
    price: 9000,
    stock: 25,
    image: "./images/lemontea.png",
    description: "Perpaduan teh dan lemon yang menyegarkan."
  },
  {
    id: "air-mineral",
    name: "Air Mineral",
    category: "Minuman",
    price: 5000,
    stock: 30,
    image: "./images/airmineral.png",
    description: "Air mineral dingin untuk menemani hidangan."
  },
  {
    id: "kopi-susu",
    name: "Kopi Susu RasaKita",
    category: "Minuman",
    price: 15000,
    stock: 20,
    image: "./images/kopisusu.png",
    description: "Kopi susu creamy dengan rasa seimbang."
  },
  {
    id: "kentang",
    name: "Kentang Goreng",
    category: "Snack",
    price: 12000,
    stock: 20,
    image: "./images/kentanggoreng.png",
    description: "Kentang goreng renyah cocok untuk berbagi."
  },
  {
    id: "tahu-goreng",
    name: "Tahu Goreng",
    category: "Snack",
    price: 10000,
    stock: 20,
    image: "./images/tahugoreng.png",
    description: "Tahu goreng renyah disajikan dengan sambal."
  },
  {
    id: "pisang",
    name: "Pisang Coklat",
    category: "Snack",
    price: 10000,
    stock: 20,
    image: "./images/piscok.png",
    description: "Pisang cokelat dengan topping manis."
  }
];

let app, auth, db, firebaseReady=false, currentUser=null, profile=null, products={}, orders={}, cart={};
let activeCategory="Semua", searchText="", authMode="login", toastTimer;
let driverProfiles = {};
let ordersUnsubscribe = null;

function showToast(message){const t=$("#toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2800)}
function openModal(html){$("#modal-content").innerHTML=html;$("#modal-backdrop").hidden=false;document.body.style.overflow="hidden"}
function closeModal(){$("#modal-backdrop").hidden=true;document.body.style.overflow="";$("#modal-content").innerHTML=""}
$("#modal-close").addEventListener("click",closeModal);
$("#modal-backdrop").addEventListener("click",e=>{if(e.target.id==="modal-backdrop")closeModal()});
$("#year").textContent=new Date().getFullYear();

function isConfigured(){return firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("GANTI_") && firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("GANTI_") && firebaseConfig.databaseURL && !firebaseConfig.databaseURL.includes("GANTI_")}
if(isConfigured()){
 try{
  app=initializeApp(firebaseConfig);auth=getAuth(app);db=getDatabase(app);firebaseReady=true;
  onAuthStateChanged(auth,async user=>{
   if (ordersUnsubscribe) { ordersUnsubscribe(); ordersUnsubscribe = null; }
   currentUser=user;profile=null;orders={};knownOrderIds=null;
   if(user){try{const snap=await get(ref(db,`users/${user.uid}`));profile=snap.exists()?snap.val():{name:user.email?.split("@")[0]||"Customer",role:"customer"};}catch(e){console.error(e)}}

   updateAuthButton();
   subscribeProducts();

   if (user && profile?.role === "admin") subscribeOrders();
   else if (user && profile?.role === "driver") subscribeAssignedOrders("driverId", user.uid);
   else if (user) subscribeAssignedOrders("customerId", user.uid);

  });
 }catch(e){console.error(e);showToast("Konfigurasi Firebase belum benar.")}
}else{
 products=Object.fromEntries(demoProducts.map(p=>[p.id,p]));renderMenu();
}
function updateAuthButton(){const b=$("#auth-shortcut");b.textContent=currentUser?(profile?.role==="admin"?"Admin":profile?.name?.split(" ")[0]||"Akun"):"Masuk";b.title=currentUser?currentUser.email:"Masuk atau daftar"}
function subscribeProducts(){
 onValue(ref(db,"products"),snap=>{
  const data=snap.val();
  products=data||{};
  if(!data) products=Object.fromEntries(demoProducts.map(p=>[p.id,p]));
  renderMenu();
 },err=>{console.error(err);showToast("Gagal memuat menu. Periksa aturan Firebase.")});
}

async function seedRasaKitaProducts() {
  if (!currentUser || profile?.role !== "admin") {
    showToast("Fitur ini hanya untuk admin.");
    return;
  }

  const finalProducts = [
    { id: "nasi-goreng", name: "Nasi Goreng Spesial", category: "Makanan", price: 22000, stock: 20, image: "./images/nasigorengmenu.png", emoji: "🍛", description: "Nasi goreng gurih dengan telur dan topping pilihan." },
    { id: "ayam-bakar", name: "Ayam Bakar", category: "Makanan", price: 20000, stock: 18, image: "./images/ayambakar.png", emoji: "🍗", description: "Ayam bakar berbumbu dengan cita rasa gurih manis." },
    { id: "mie-ayam", name: "Mie Ayam", category: "Makanan", price: 18000, stock: 20, image: "./images/mieayam.png", emoji: "🍜", description: "Mie ayam hangat dengan topping ayam dan sayuran." },
    { id: "gurami-bakar", name: "Gurami Bakar", category: "Makanan", price: 35000, stock: 10, image: "./images/guramibakar.png", emoji: "🐟", description: "Gurami bakar dengan sambal dan lalapan." },
    { id: "nila-bakar", name: "Nila Bakar", category: "Makanan", price: 30000, stock: 12, image: "./images/nilabakar.png", emoji: "🐟", description: "Ikan nila bakar berbumbu dengan lalapan segar." },
    { id: "bakso", name: "Bakso", category: "Makanan", price: 10000, stock: 20, image: "./images/bakso.png", emoji: "🍲", description: "Bakso hangat dengan kuah gurih." },
    { id: "nasi-putih", name: "Nasi Putih", category: "Makanan", price: 4000, stock: 30, image: "./images/nasiputih.png", emoji: "🍚", description: "Nasi putih hangat sebagai pelengkap hidangan." },
    { id: "es-teh", name: "Es Teh Nusantara", category: "Minuman", price: 6000, stock: 40, image: "./images/esteh.png", emoji: "🧋", description: "Es teh segar untuk menemani waktu makan." },
    { id: "lemon-tea", name: "Lemon Tea", category: "Minuman", price: 9000, stock: 25, image: "./images/lemontea.png", emoji: "🍋", description: "Perpaduan teh dan lemon yang menyegarkan." },
    { id: "air-mineral", name: "Air Mineral", category: "Minuman", price: 5000, stock: 30, image: "./images/airmineral.png", emoji: "💧", description: "Air mineral untuk menemani hidangan." },
    { id: "kopi-susu", name: "Kopi Susu RasaKita", category: "Minuman", price: 15000, stock: 20, image: "./images/kopisusu.png", emoji: "☕", description: "Kopi susu creamy dengan rasa seimbang." },
    { id: "kentang", name: "Kentang Goreng", category: "Snack", price: 12000, stock: 20, image: "./images/kentanggoreng.png", emoji: "🍟", description: "Kentang goreng renyah cocok untuk berbagi." },
    { id: "tahu-goreng", name: "Tahu Goreng", category: "Snack", price: 10000, stock: 20, image: "./images/tahugoreng.png", emoji: "🍽️", description: "Tahu goreng renyah disajikan dengan sambal." },
    { id: "pisang", name: "Pisang Coklat", category: "Snack", price: 10000, stock: 20, image: "./images/piscok.png", emoji: "🍌", description: "Pisang cokelat dengan topping manis." }
  ];

  const confirmed = window.confirm(
    "Simpan 14 menu final ke Firebase? " +
    "Produk dengan ID yang sama akan diperbarui, termasuk stoknya. " +
    "Produk lain tidak dihapus. Lanjutkan?"
  );

  if (!confirmed) return;

  try {
    for (const product of finalProducts) {
      await set(ref(db, `products/${product.id}`), product);
    }

    showToast("14 menu berhasil disimpan ke Firebase.");
  } catch (error) {
    console.error("Gagal menyimpan katalog:", error);
    showToast("Katalog gagal disimpan. Periksa akses admin.");
  }
}

let knownOrderIds = null;
let unreadOrderIds = new Set();
let isOrdersModalOpen = false;

function playNewOrderSound() {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;

    oscillator.start();

    gain.gain.setValueAtTime(0.15, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + 0.5
    );

    oscillator.stop(audio.currentTime + 0.5);
    oscillator.onended = () => audio.close();
  } catch (error) {
    console.warn("Suara notifikasi tidak dapat diputar:", error);
  }
}



let orderReadAt = null;

async function subscribeOrders() {
  if (!currentUser || profile?.role !== "admin") return;

  const readAtRef = ref(
    db,
    `adminOrderReadAt/${currentUser.uid}`
  );

  try {
    const readAtSnapshot = await get(readAtRef);

    if (readAtSnapshot.exists()) {
      orderReadAt = Number(readAtSnapshot.val());
    } else {
      // Pertama kali: jadikan pesanan lama sebagai data awal.
      const initialSnapshot = await get(ref(db, "orders"));
      const initialOrders = initialSnapshot.val() || {};

      orderReadAt = Math.max(
        0,
        ...Object.values(initialOrders).map(
          order => Number(order.createdAt) || 0
        )
      );

      await set(readAtRef, orderReadAt);
    }
  } catch (error) {
    console.error("Gagal memuat status notifikasi:", error);
    showToast("Gagal memuat status notifikasi pesanan.");
    return;
  }

  let initialized = false;

  ordersUnsubscribe = onValue(
    ref(db, "orders"),
    snap => {
      const updatedOrders = snap.val() || {};
      const currentIds = new Set(Object.keys(updatedOrders));

      const newUnreadIds = new Set(
        Object.entries(updatedOrders)
          .filter(([id, order]) =>
            (Number(order.createdAt) || 0) > orderReadAt
          )
          .map(([id]) => id)
      );

      const newlyArrived = initialized
        ? [...currentIds].filter(
            id => !knownOrderIds.has(id)
          )
        : [];

      orders = updatedOrders;
      knownOrderIds = currentIds;
      unreadOrderIds = newUnreadIds;

      if (newlyArrived.length > 0) {
        playNewOrderSound();

        showToast(
          newlyArrived.length === 1
            ? "🔔 Pesanan baru masuk!"
            : `🔔 ${newlyArrived.length} pesanan baru masuk!`
        );
      }

      initialized = true;
    },
    error => {
      console.error("Gagal memantau pesanan:", error);
    }
  );
}


// Customer and driver only receive their own orders through constrained queries.
function subscribeAssignedOrders(field, uid) {
  const ownOrdersQuery = query(ref(db, "orders"), orderByChild(field), equalTo(uid));
  ordersUnsubscribe = onValue(
    ownOrdersQuery,
    snapshot => {
      orders = snapshot.val() || {};
      // Perbarui tampilan pelanggan secara realtime saat admin/driver mengubah status.
      if (profile?.role === "customer" && document.getElementById("my-orders-live")) {
        renderMyOrdersContent();
      }
    },
    error => {
      console.error(`Gagal memuat pesanan ${field}:`, error);
      showToast("Gagal memuat pesanan akun ini. Periksa Firebase Rules.");
    }
  );
}



function renderMenu() {
  const list = Object.entries(products).map(([id, p]) => ({
    ...p,
    id
  }));

  const filtered = list.filter(p =>
    (activeCategory === "Semua" || p.category === activeCategory) &&
    `${p.name} ${p.description || ""}`
      .toLowerCase()
      .includes(searchText)
  );

  $("#menu-grid").innerHTML = filtered.length
    ? filtered.map(p => `
        <article class="food-card">
          <div class="food-image">
            <span class="food-label">
              ${escapeHtml(p.category || "Menu")}
            </span>

            ${
              p.image
                ? `
                  <img
                    class="food-photo"
                    src="${escapeHtml(p.image)}"
                    alt="${escapeHtml(p.name)}"
                    loading="lazy"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                  >
                  <span
                    class="emoji food-photo-fallback"
                    style="display:none"
                    aria-label="Gambar tidak tersedia"
                  >${escapeHtml(p.emoji || "🍽️")}</span>
                `
                : `
                  <span class="emoji">
                    ${escapeHtml(p.emoji || "🍽️")}
                  </span>
                `
            }
          </div>

          <div class="food-info">
            <h3>${escapeHtml(p.name)}</h3>

            <p>
              ${escapeHtml(
                p.description || "Menu pilihan RasaKita."
              )}
            </p>

            <div class="food-bottom">
              <span class="price">${money(p.price)}</span>

              <button
                class="add-button"
                data-add="${escapeHtml(p.id)}"
                aria-label="Tambah ${escapeHtml(p.name)}"
                ${Number(p.stock ?? 1) <= 0 ? "disabled" : ""}
              >+</button>
            </div>
          </div>
        </article>
      `).join("")
    : `
        <div class="empty-state">
          Menu tidak ditemukan. Coba kata kunci lain, ya.
        </div>
      `;

  $("#menu-grid")
    .querySelectorAll("[data-add]")
    .forEach(button => {
      button.addEventListener("click", () => {
        addToCart(button.dataset.add);
      });
    });
}

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("#category-row").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;activeCategory=b.dataset.category;$("#category-row").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));renderMenu()});
$("#search-input").addEventListener("input",e=>{searchText=e.target.value.trim().toLowerCase();renderMenu()});

function addToCart(id){const p=products[id];if(!p)return;cart[id]=(cart[id]||0)+1;$("#cart-count").textContent=Object.values(cart).reduce((a,b)=>a+b,0);showToast(`${p.name} ditambahkan ke keranjang`)}
function cartTotal(){return Object.entries(cart).reduce((sum,[id,q])=>sum+Number(products[id]?.price||0)*q,0)}
$("#cart-shortcut").addEventListener("click",showCart);
function showCart(){
 const entries=Object.entries(cart).filter(([id,q])=>q>0&&products[id]);
 openModal(`<h2 id="modal-title">Keranjangmu</h2><p class="subtext">Periksa pesanan sebelum melanjutkan checkout.</p>
 ${entries.length?entries.map(([id,q])=>`<div class="cart-line"><div><strong>${escapeHtml(products[id].name)}</strong><small>${money(products[id].price)} · ${money(products[id].price*q)}</small></div><div class="qty-control"><button data-qty="${id}" data-delta="-1">−</button><b>${q}</b><button data-qty="${id}" data-delta="1">+</button></div></div>`).join(""):`<div class="empty-state">Keranjangmu masih kosong.</div>`}
 <div class="total-row"><span>Total</span><span>${money(cartTotal())}</span></div>
 ${entries.length?`<button class="primary-button full-button" id="go-checkout">Lanjut checkout <span>→</span></button>`:""}
 <button class="text-button" id="continue-shopping">Lanjut pilih menu</button>`);
 $("#modal-content").querySelectorAll("[data-qty]").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.qty;cart[id]=(cart[id]||0)+Number(b.dataset.delta);if(cart[id]<=0)delete cart[id];$("#cart-count").textContent=Object.values(cart).reduce((a,b)=>a+b,0);showCart()}));
 $("#continue-shopping").addEventListener("click",closeModal);
 $("#go-checkout")?.addEventListener("click",()=>{if(!currentUser){showAuth("login","Silakan login sebelum checkout.");return}showCheckout()});
}
$("#auth-shortcut").addEventListener("click",()=>currentUser?showAccount():showAuth());
function showAuth(mode="login",notice=""){
 authMode=mode;
 openModal(`<h2 id="modal-title">${mode==="login"?"Selamat datang kembali":"Buat akun RasaKita"}</h2><p class="subtext">${notice|| (mode==="login"?"Masuk untuk melanjutkan pesananmu.":"Daftar agar kamu bisa memesan menu favorit.")}</p>
 <form id="auth-form">
 ${mode==="register"?`<div class="form-field"><label for="auth-name">Nama lengkap</label><input id="auth-name" required autocomplete="name" placeholder="Nama kamu"></div>`:""}
 <div class="form-field"><label for="auth-email">Email</label><input id="auth-email" type="email" required autocomplete="email" placeholder="nama@email.com"></div>
 <div class="form-field"><label for="auth-password">Kata sandi</label><input id="auth-password" type="password" minlength="6" required autocomplete="${mode==="login"?"current-password":"new-password"}" placeholder="Minimal 6 karakter"></div>
 <button class="primary-button full-button" type="submit">${mode==="login"?"Masuk":"Buat akun"} <span>→</span></button></form>
 <p class="form-note">Demo awal: Firebase Authentication harus dikonfigurasi untuk mengaktifkan akun.</p>
 <button class="text-button" id="toggle-auth">${mode==="login"?"Belum punya akun? Daftar":"Sudah punya akun? Masuk"}</button>`);
 $("#toggle-auth").addEventListener("click",()=>showAuth(mode==="login"?"register":"login"));
 $("#auth-form").addEventListener("submit",async e=>{
  e.preventDefault();const email=$("#auth-email").value.trim(),password=$("#auth-password").value;
  if(!firebaseReady){showToast("Tambahkan konfigurasi Firebase terlebih dahulu.");return}
  try{
   let cred;

if (mode === "register") {
  const name = $("#auth-name").value.trim();

  cred = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  await set(ref(db, `users/${cred.user.uid}`), {
    name,
    email,
    role: "customer",
    createdAt: Date.now()
  });
} else {
  cred = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
}
   closeModal();showToast(mode==="login"?"Berhasil masuk":"Akun berhasil dibuat");
  }catch(err){showToast(authError(err.code))}
 });
}
function authError(code){return ({"auth/invalid-credential":"Email atau kata sandi tidak sesuai.","auth/email-already-in-use":"Email sudah terdaftar.","auth/weak-password":"Kata sandi minimal 6 karakter.","auth/invalid-email":"Format email tidak valid.","auth/operation-not-allowed":"Aktifkan Email/Password di Firebase Authentication.","auth/network-request-failed":"Periksa koneksi internet."})[code]||"Gagal memproses akun. Periksa konfigurasi dan coba lagi."}
function showAccount(){
 const role=profile?.role||"customer";
 openModal(`<h2 id="modal-title">Halo, ${escapeHtml(profile?.name||"Customer")}!</h2><p class="subtext">${escapeHtml(currentUser?.email||"")}</p>
 <button class="primary-button full-button" id="my-orders">Lihat pesanan saya</button>
 ${role==="admin"?`<button class="primary-button full-button" id="admin-panel" style="margin-top:10px">Buka dashboard admin</button>`:""}
 ${role==="driver"?`<button class="primary-button full-button" id="driver-panel" style="margin-top:10px">Lihat tugas pengantaran</button>`:""}
 <button class="text-button" id="sign-out">Keluar dari akun</button>`);
 $("#my-orders").addEventListener("click",showMyOrders);
 $("#admin-panel")?.addEventListener("click",showAdmin);
 $("#driver-panel")?.addEventListener("click",showDriver);
 $("#sign-out").addEventListener("click",async()=>{await signOut(auth);cart={};$("#cart-count").textContent="0";closeModal();showToast("Kamu sudah keluar.")});
}

function showCheckout() {
  const entries = Object.entries(cart).filter(([id, q]) => q > 0 && products[id]);

  if (!entries.length) {
    showToast("Keranjang masih kosong.");
    return;
  }

  openModal(`
    <h2 id="modal-title">Checkout</h2>
    <p class="subtext">Lengkapi informasi pengiriman dan pilih metode pembayaran.</p>

    <form id="checkout-form">
      <div class="form-field">
        <label for="checkout-name">Nama penerima</label>
        <input id="checkout-name" required
          value="${escapeHtml(profile?.name || "")}">
      </div>

      <div class="form-field">
        <label for="checkout-phone">Nomor WhatsApp/telepon</label>
        <input id="checkout-phone" required inputmode="tel"
          placeholder="08xxxxxxxxxx">
      </div>

      <div class="form-field">
        <label for="checkout-address">Alamat lengkap</label>
        <textarea id="checkout-address" required
          placeholder="Alamat pengiriman"></textarea>
      </div>

      <div class="form-field">
        <label for="checkout-payment">Metode pembayaran</label>
        <select id="checkout-payment" required>
          <option value="Transfer bank">Transfer bank</option>
          <option value="QRIS manual">QRIS (konfirmasi manual)</option>
          <option value="Bayar tunai">Bayar tunai</option>
        </select>
      </div>

      <div class="payment-box">
        Pembayaran manual akan diverifikasi oleh admin.
      </div>

      <div class="total-row">
        <span>Total pesanan</span>
        <span>${money(cartTotal())}</span>
      </div>

      <button class="primary-button full-button" type="submit">
        Buat pesanan →
      </button>
    </form>
  `);

  $("#checkout-form").addEventListener("submit", async e => {
    e.preventDefault();

    if (!firebaseReady || !currentUser) {
      showToast("Silakan login terlebih dahulu.");
      return;
    }

    const items = {};

    for (const [id, q] of entries) {
      items[id] = {
        name: products[id].name,
        price: Number(products[id].price),
        quantity: q,
        subtotal: Number(products[id].price) * q
      };
    }

    const order = {
      customerId: currentUser.uid,
      customerName: $("#checkout-name").value.trim(),
      email: currentUser.email,
      phone: $("#checkout-phone").value.trim(),
      address: $("#checkout-address").value.trim(),
      paymentMethod: $("#checkout-payment").value,
      items,
      total: cartTotal(),
      status: "Menunggu verifikasi pembayaran",
      paymentStatus: "Menunggu verifikasi admin",
      driverId: null,
      createdAt: Date.now()
    };

    try {
      const newRef = push(ref(db, "orders"));
      await set(newRef, order);

      cart = {};
      $("#cart-count").textContent = "0";

      showPaymentInstructions(newRef.key, order);
    } catch (err) {
      console.error(err);
      showToast("Pesanan gagal disimpan. Periksa aturan Firebase.");
    }
  });
}


function showPaymentInstructions(orderId, order) {
  let paymentContent = "";

  if (order.paymentMethod === "QRIS manual") {
    paymentContent = `
      <div class="payment-box">
        <strong>Pembayaran QRIS</strong>
        <p>QRIS merchant RasaKita belum tersedia.</p>
        <small>
          Silakan hubungi admin untuk memilih metode pembayaran lain.
          Jangan melakukan pembayaran ke QR code demo.
        </small>
      </div>
    `;
  } else if (order.paymentMethod === "Transfer bank") {
    paymentContent = `
      <div class="payment-box">
        <strong>Instruksi transfer bank — SeaBank</strong>

        <p>Transfer sesuai total pembayaran pesananmu ke rekening berikut.</p>

        <div class="bank-account">
          <small>Bank</small>
          <strong>SeaBank</strong>

          <small>Nomor rekening</small>
          <div class="bank-account-number">
            <strong id="seabank-account">9018466963000</strong>
            <button
              type="button"
              class="small-action green"
              id="copy-seabank-account">
              Salin rekening
            </button>
          </div>

          <small>Nama pemilik rekening</small>
          <strong>Hamdani Syahdan M.</strong>

          <small>Total pembayaran</small>
          <strong>${money(order.total)}</strong>
        </div>

        <p>
          Setelah transfer, tunggu admin memeriksa dana masuk
          dan memverifikasi pembayaran.
        </p>

        <small>
          Jangan menganggap pembayaran berhasil sebelum dikonfirmasi admin.
        </small>
      </div>
    `;
  } else {
    paymentContent = `
      <div class="payment-box">
        <strong>Instruksi pembayaran</strong>
        <p>Silakan hubungi admin untuk konfirmasi metode pembayaran.</p>
      </div>
    `;
  }

  openModal(`
    <h2 id="modal-title">Pesanan berhasil dibuat!</h2>

    <p class="subtext">
      Nomor pesanan: #${escapeHtml(orderId.slice(-6).toUpperCase())}
    </p>

    <div class="order-total-row">
      <strong>Total pembayaran</strong>
      <strong>${money(order.total)}</strong>
    </div>

    ${paymentContent}

  
<div class="payment-box">
  <strong>Status pembayaran</strong>
  <p>Menunggu verifikasi admin.</p>
  <small>
    Setelah transfer, hubungi admin untuk konfirmasi.
    Pembayaran baru disetujui setelah dana masuk diperiksa.
  </small>
</div>

<a
  class="primary-button full-button"
  id="confirm-payment-whatsapp"
  href="${createPaymentWhatsAppLink(orderId, order)}"
  target="_blank"
  rel="noopener noreferrer"
  style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-bottom:12px"
>
  Konfirmasi via WhatsApp
</a>


    <button class="primary-button full-button" id="view-my-orders">
      Lihat pesanan saya →
    </button>
  `);

  const copyButton = document.getElementById("copy-seabank-account");

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("9018466963000");
        showToast("Nomor rekening berhasil disalin.");
      } catch (error) {
        console.error("Gagal menyalin rekening:", error);
        showToast("Gagal menyalin. Silakan salin nomor rekening manual.");
      }
    });
  }

  const viewOrdersButton = document.getElementById("view-my-orders");

  if (viewOrdersButton) {
    viewOrdersButton.addEventListener("click", () => {
      closeModal();
      showMyOrders();
    });
  }
}

function createPaymentWhatsAppLink(orderId, order) {
  const adminPhone = "6281259851942";

  const message = [
    "Halo Admin RasaKita, saya ingin mengonfirmasi pembayaran.",
    "",
    `Nomor pesanan: #${orderId.slice(-6).toUpperCase()}`,
    `Nama: ${order.customerName || "-"}`,
    `Total pembayaran: ${money(order.total)}`,
    `Metode pembayaran: ${order.paymentMethod || "Transfer bank"}`,
    "",
    "Mohon diperiksa. Terima kasih."
  ].join("\n");

  return `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
}


function statusLabel(s){return s||"Menunggu verifikasi pembayaran"}

// Hanya tampilkan tautan bukti dari domain delivery Cloudinary yang kita gunakan.
function deliveryProofLink(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function deliveryProofView(order) {
  const url = deliveryProofLink(order?.deliveryProofUrl);
  if (!url) return "";
  return `
    <div class="delivery-proof-box">
      <strong>📸 Bukti pengantaran</strong>
      <p>Driver telah mengunggah foto bukti pesanan.</p>
      <a class="small-action green" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Lihat foto bukti</a>
    </div>
  `;
}

function customerOrderProgress(status) {
  if (status === "Dibatalkan") {
    return `<div class="customer-order-cancelled">Pesanan dibatalkan</div>`;
  }

  const stages = [
    { label: "Pesanan diterima", statuses: ["Menunggu verifikasi pembayaran", "Menunggu verifikasi admin", "Pesanan diproses", "Menunggu driver", "Dalam pengantaran", "Selesai"] },
    { label: "Diproses", statuses: ["Pesanan diproses", "Menunggu driver", "Dalam pengantaran", "Selesai"] },
    { label: "Menunggu driver", statuses: ["Menunggu driver", "Dalam pengantaran", "Selesai"] },
    { label: "Dalam pengantaran", statuses: ["Dalam pengantaran", "Selesai"] },
    { label: "Selesai", statuses: ["Selesai"] }
  ];
  const activeIndex = stages.reduce((last, stage, index) => stage.statuses.includes(status) ? index : last, 0);
  return `<div class="customer-progress" aria-label="Progres pesanan">${stages.map((stage, index) => `
    <div class="customer-progress-step ${index <= activeIndex ? "is-done" : ""} ${index === activeIndex ? "is-current" : ""}">
      <span class="customer-progress-dot">${index < activeIndex ? "✓" : index + 1}</span>
      <span>${stage.label}</span>
    </div>`).join("")}</div>`;
}

function renderMyOrdersContent() {
  const container = document.getElementById("my-orders-live");
  if (!container || !currentUser) return;

  const list = Object.entries(orders || {})
    .filter(([, order]) => order.customerId === currentUser.uid)
    .sort((a, b) => (Number(b[1].createdAt) || 0) - (Number(a[1].createdAt) || 0));

  container.innerHTML = list.length ? list.map(([id, order]) => {
    const verified = order.paymentStatus === "Terverifikasi admin";
    const items = Object.values(order.items || {});
    const status = statusLabel(order.status);
    return `
      <article class="order-card customer-tracking-card">
        <div class="order-card-head">
          <strong>Pesanan #${escapeHtml(id.slice(-6).toUpperCase())}</strong>
          <span class="status-pill">${escapeHtml(status)}</span>
        </div>
        <p class="customer-order-date">${order.createdAt ? new Date(Number(order.createdAt)).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Waktu pemesanan tidak tersedia"}</p>
        ${customerOrderProgress(status)}
        <div class="order-items">
          ${items.length ? items.map(item => `<div class="order-item-row"><span>${escapeHtml(item.name || "Menu")}</span><span>× ${Number(item.quantity) || 0}</span></div>`).join("") : `<p>Detail menu tidak tersedia.</p>`}
        </div>
        <div class="payment-box">
          <strong>Status pembayaran</strong>
          <p>${escapeHtml(order.paymentStatus || "Menunggu verifikasi admin")}</p>
          <strong>Metode pembayaran</strong>
          <p>${escapeHtml(order.paymentMethod || "-")}</p>
        </div>
        <div class="order-total-row"><span>Total pembayaran</span><strong>${money(order.total)}</strong></div>
        ${verified ? `<div class="payment-box">✓ Pembayaran telah diverifikasi admin.</div>` : `<a class="primary-button full-button" href="${createPaymentWhatsAppLink(id, order)}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:12px">Konfirmasi via WhatsApp</a>`}
      </article>`;
  }).join("") : `<div class="empty-state">Belum ada pesanan. Yuk, pilih menu favoritmu!</div>`;
}

function showMyOrders() {
  if (!currentUser) {
    showAuth();
    return;
  }

  openModal(`
    <h2 id="modal-title">Pesanan saya</h2>
    <p class="subtext">Pantau status pesananmu secara langsung di sini. Status akan berubah otomatis ketika admin atau driver memperbarui pesanan.</p>
    <div id="my-orders-live"><div class="empty-state">Memuat pesanan...</div></div>
    <button class="text-button" id="orders-close">Kembali ke menu</button>
  `);

  renderMyOrdersContent();
  $("#orders-close").addEventListener("click", closeModal);
}

$("#orders-shortcut").addEventListener("click",()=>currentUser?showMyOrders():showAuth("login","Masuk untuk melihat status pesananmu."));



function showAdmin() {
  if (profile?.role !== "admin") {
    showToast("Akses khusus admin.");
    return;
  }

  // Dashboard admin dibuat sebagai halaman penuh agar lebih nyaman
  // digunakan di desktop, tanpa mengubah alur pelanggan.
  closeModal();
  document.getElementById("admin-dashboard")?.remove();

  const orderRows = Object.entries(orders || {})
    .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
  const totalOrders = orderRows.length;
  const waitingOrders = orderRows.filter(([, o]) =>
    ["Menunggu verifikasi pembayaran", "Menunggu verifikasi admin"].includes(o.status) ||
    o.paymentStatus !== "Terverifikasi admin"
  ).length;
  const deliveryOrders = orderRows.filter(([, o]) =>
    ["Menunggu driver", "Dalam pengantaran"].includes(o.status)
  ).length;
  const completedOrders = orderRows.filter(([, o]) => o.status === "Selesai").length;
  const revenue = orderRows
    .filter(([, o]) => o.paymentStatus === "Terverifikasi admin" && o.status !== "Dibatalkan")
    .reduce((sum, [, o]) => sum + (Number(o.total) || 0), 0);
  const recentRows = orderRows.slice(0, 5);

  const root = document.createElement("section");
  root.id = "admin-dashboard";
  root.className = "admin-dashboard";
  root.innerHTML = `
    <aside class="admin-sidebar">
      <a class="admin-brand" href="#admin-home"><span class="brand-mark">R</span><span>Rasa<span>Kita</span><small>ADMIN PANEL</small></span></a>
      <div class="admin-profile"><div class="admin-avatar">${escapeHtml((profile?.name || "A").slice(0,1).toUpperCase())}</div><div><strong>${escapeHtml(profile?.name || "Administrator")}</strong><small>Administrator</small></div></div>
      <p class="admin-nav-label">MENU UTAMA</p>
      <nav class="admin-nav">
        <button class="admin-nav-item active" id="admin-nav-home"><span>▦</span> Dashboard</button>
        <button class="admin-nav-item" id="admin-nav-orders"><span>▤</span> Pesanan ${unreadOrderIds.size ? `<b>${unreadOrderIds.size}</b>` : ""}</button>
        <button class="admin-nav-item" id="admin-nav-products"><span>🍽</span> Manajemen Menu</button>
        <button class="admin-nav-item" id="admin-nav-drivers"><span>♧</span> Manajemen Driver</button>
      </nav>
      <div class="admin-sidebar-bottom">
        <button class="admin-nav-item" id="admin-nav-store"><span>↗</span> Lihat halaman toko</button>
        <button class="admin-nav-item admin-logout" id="admin-nav-logout"><span>⇥</span> Keluar akun</button>
      </div>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <div><span class="admin-kicker">RASAKITA MANAGEMENT</span><h1>Dashboard</h1><p>Selamat datang kembali, ${escapeHtml(profile?.name || "Admin")}! Berikut ringkasan tokomu.</p></div>
        <div class="admin-top-actions"><span class="admin-date">${new Date().toLocaleDateString("id-ID", {weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span><button class="admin-icon-btn" id="admin-refresh" title="Muat ulang">↻</button></div>
      </header>

      <section class="admin-stat-grid">
        <article class="admin-stat-card"><div class="admin-stat-icon orange">▤</div><div><span>Total Pesanan</span><strong>${totalOrders}</strong><small>Semua pesanan masuk</small></div></article>
        <article class="admin-stat-card"><div class="admin-stat-icon amber">◷</div><div><span>Perlu Ditinjau</span><strong>${waitingOrders}</strong><small>Menunggu verifikasi</small></div></article>
        <article class="admin-stat-card"><div class="admin-stat-icon blue">♧</div><div><span>Dalam Pengantaran</span><strong>${deliveryOrders}</strong><small>Pesanan berjalan</small></div></article>
        <article class="admin-stat-card"><div class="admin-stat-icon green">✓</div><div><span>Pesanan Selesai</span><strong>${completedOrders}</strong><small>Berhasil diantarkan</small></div></article>
      </section>

      <section class="admin-revenue-card"><div><span>Estimasi pendapatan terverifikasi</span><strong>${money(revenue)}</strong><small>Dihitung dari pesanan terverifikasi dan tidak dibatalkan</small></div><div class="admin-revenue-mark">Rp</div></section>

      <section class="admin-content-card">
        <div class="admin-card-heading"><div><h2>Pesanan terbaru</h2><p>Pantau aktivitas pesanan yang baru masuk.</p></div><button class="admin-link-btn" id="admin-see-orders">Lihat semua pesanan →</button></div>
        ${recentRows.length ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ID PESANAN</th><th>PELANGGAN</th><th>TANGGAL</th><th>STATUS</th><th>TOTAL</th></tr></thead><tbody>${recentRows.map(([id,o])=>`<tr><td><strong>#${escapeHtml(id.slice(-6).toUpperCase())}</strong></td><td>${escapeHtml(o.customerName || "Pelanggan")}</td><td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString("id-ID") : "-"}</td><td><span class="admin-status">${escapeHtml(statusLabel(o.status))}</span></td><td><strong>${money(o.total)}</strong></td></tr>`).join("")}</tbody></table></div>` : `<div class="admin-empty"><span>▤</span><strong>Belum ada pesanan</strong><p>Pesanan pelanggan akan muncul di sini.</p></div>`}
      </section>
      <p class="admin-footer-note">RasaKita Admin · Kelola operasional tokomu dengan mudah.</p>
    </main>
  `;
  document.body.appendChild(root);

  $("#admin-nav-home").addEventListener("click", showAdmin);
  $("#admin-nav-orders").addEventListener("click", () => showManageOrders());
  $("#admin-see-orders").addEventListener("click", () => showManageOrders());
  $("#admin-nav-products").addEventListener("click", showManageProducts);
  $("#admin-nav-drivers").addEventListener("click", showManageDrivers);
  $("#admin-nav-store").addEventListener("click", () => {
    root.remove();
    showAccount();
  });
  $("#admin-nav-logout").addEventListener("click", async () => {
    if (!window.confirm("Keluar dari akun admin?")) return;
    root.remove();
    await signOut(auth);
    showToast("Kamu sudah keluar.");
  });
  $("#admin-refresh").addEventListener("click", () => {
    showAdmin();
    showToast("Dashboard diperbarui.");
  });
}

async function showManageDrivers() {
  if (profile?.role !== "admin") return showToast("Akses khusus admin.");
  openModal(`<h2 id="modal-title">Manajemen Driver</h2>
    <p class="subtext">Daftar akun yang sudah memiliki role driver di Firebase.</p>
    <div class="empty-state">Memuat daftar driver...</div>
    <button class="text-button" id="drivers-back">Kembali ke admin</button>`);
  $("#drivers-back").addEventListener("click", showAdmin);

  try {
    const snapshot = await get(ref(db, "users"));
    const users = snapshot.val() || {};
    driverProfiles = Object.fromEntries(
      Object.entries(users).filter(([uid, user]) => user?.role === "driver")
    );
    const drivers = Object.entries(driverProfiles);
    const content = drivers.length ? drivers.map(([uid, driver]) => `
      <article class="admin-item">
        <div><strong>${escapeHtml(driver.name || "Driver")}</strong>
          <p>${escapeHtml(driver.email || "Email tidak tercatat")}</p>
          <small style="color:#9297a0">UID: ${escapeHtml(uid)}</small>
        </div><span class="status-pill">Aktif</span>
      </article>`).join("") : `
      <div class="empty-state">Belum ada akun dengan role driver.</div>`;

    $("#modal-content").innerHTML = `
      <h2 id="modal-title">Manajemen Driver</h2>
      <p class="subtext">${drivers.length} akun driver terdaftar. Admin dapat menugaskan mereka melalui halaman pesanan.</p>
      ${content}
      <div class="payment-box">
        <strong>Menambahkan akun driver</strong>
        <ol style="padding-left:18px;margin:8px 0">
          <li>Buat akun email/password di Firebase Authentication.</li>
          <li>Salin UID akun yang dibuat.</li>
          <li>Di Realtime Database, buat <code>users/UID</code> dengan data <code>name</code>, <code>email</code>, dan <code>role: "driver"</code>.</li>
        </ol>
        <small>Jangan membuat akun driver dari browser admin. Pembuatan akun produksi sebaiknya memakai backend tepercaya/Cloud Functions.</small>
      </div>
      <button class="text-button" id="drivers-back">Kembali ke admin</button>`;
    $("#drivers-back").addEventListener("click", showAdmin);
  } catch (error) {
    console.error("Gagal memuat driver:", error);
    $("#modal-content").innerHTML = `
      <h2 id="modal-title">Manajemen Driver</h2>
      <div class="payment-box">Daftar akun tidak dapat dibaca. Periksa Firebase Realtime Database Rules: admin perlu izin membaca node <code>users</code>.</div>
      <button class="text-button" id="drivers-back">Kembali ke admin</button>`;
    $("#drivers-back").addEventListener("click", showAdmin);
  }
}

function showManageProducts(){
 const rows=Object.entries(products).map(([id,p])=>`<div class="admin-item"><div><strong>${escapeHtml(p.name)}</strong><p>${money(p.price)} · Stok ${Number(p.stock??0)}</p></div><button class="small-action" data-edit-product="${escapeHtml(id)}">Edit</button></div>`).join("");
 openModal(`<h2 id="modal-title">Produk</h2><p class="subtext">Data menu yang tersedia di database.</p>${rows}<button class="primary-button full-button" id="add-product">+ Tambah produk</button><button class="text-button" id="products-back">Kembali ke admin</button>`);
 $("#add-product").addEventListener("click",()=>productForm());$("#products-back").addEventListener("click",showAdmin);
 $("#modal-content").querySelectorAll("[data-edit-product]").forEach(b=>b.addEventListener("click",()=>productForm(b.dataset.editProduct)));
}

function productForm(id) {
  const p = id
    ? products[id]
    : {
        name: "",
        category: "Makanan",
        price: "",
        stock: 0,
        emoji: "🍽️",
        description: "",
        image: ""
      };

  openModal(`
    <h2 id="modal-title">${id ? "Edit produk" : "Tambah produk"}</h2>

    <form id="product-form">
      <div class="form-field">
        <label>Nama produk</label>
        <input id="p-name" required value="${escapeHtml(p.name || "")}">
      </div>

      <div class="form-field">
        <label>Kategori</label>
        <select id="p-category">
          <option value="Makanan" ${p.category === "Makanan" ? "selected" : ""}>Makanan</option>
          <option value="Minuman" ${p.category === "Minuman" ? "selected" : ""}>Minuman</option>
          <option value="Snack" ${p.category === "Snack" ? "selected" : ""}>Snack</option>
        </select>
      </div>

      <div class="form-field">
        <label>Harga (Rp)</label>
        <input id="p-price" type="number" min="0" required value="${Number(p.price) || ""}">
      </div>

      <div class="form-field">
        <label>Stok</label>
        <input id="p-stock" type="number" min="0" required value="${Number(p.stock) || 0}">
      </div>

      <div class="form-field">
        <label>Path foto</label>
        <input
          id="p-image"
          type="text"
          placeholder="./images/nasi-goreng.png"
          value="${escapeHtml(p.image || "")}"
        >
        <small>Contoh: ./images/nasi-goreng.png</small>
      </div>

      <div class="form-field">
        <label>Emoji cadangan</label>
        <input id="p-emoji" value="${escapeHtml(p.emoji || "🍽️")}">
      </div>

      <div class="form-field">
        <label>Deskripsi</label>
        <textarea id="p-description">${escapeHtml(p.description || "")}</textarea>
      </div>

      <button class="primary-button full-button" type="submit">
        Simpan produk
      </button>

      ${id ? `
        <button class="text-button" type="button" id="delete-product">
          Hapus produk
        </button>
      ` : ""}
    </form>
  `);

  $("#product-form").addEventListener("submit", async e => {
    e.preventDefault();

    const data = {
      name: $("#p-name").value.trim(),
      category: $("#p-category").value,
      price: Number($("#p-price").value),
      stock: Number($("#p-stock").value),
      emoji: $("#p-emoji").value.trim() || "🍽️",
      description: $("#p-description").value.trim(),
      image: $("#p-image").value.trim()
    };

    if (!data.name || data.price < 0 || data.stock < 0) {
      showToast("Periksa nama, harga, dan stok produk.");
      return;
    }

    try {
      const productId = id || push(ref(db, "products")).key;

      await set(ref(db, `products/${productId}`), data);

      showToast("Produk berhasil disimpan.");
      showManageProducts();
    } catch (error) {
      console.error("Gagal menyimpan produk:", error);
      showToast("Gagal menyimpan produk. Periksa akses admin.");
    }
  });

  $("#delete-product")?.addEventListener("click", async () => {
    if (!confirm("Hapus produk ini?")) return;

    try {
      await remove(ref(db, `products/${id}`));
      showToast("Produk berhasil dihapus.");
      showManageProducts();
    } catch (error) {
      console.error(error);
      showToast("Gagal menghapus produk.");
    }
  });
}




async function showManageOrders(selectedFilter = "Semua") {
  isOrdersModalOpen = true;
  try {
    if (!Object.keys(driverProfiles).length) {
      const usersSnapshot = await get(ref(db, "users"));
      const users = usersSnapshot.val() || {};
      driverProfiles = Object.fromEntries(
        Object.entries(users).filter(([uid, user]) => user?.role === "driver")
      );
    }
  } catch (error) {
    console.warn("Daftar driver belum dapat dimuat:", error);
  }

  const orderStatuses = [
    "Menunggu verifikasi pembayaran",
    "Pesanan diproses",
    "Menunggu driver",
    "Pesanan diterima driver",
    "Dalam pengantaran",
    "Selesai",
    "Dibatalkan"
  ];

  const allRows = Object.entries(orders || {}).sort(
    (a, b) =>
      (b[1].createdAt || 0) - (a[1].createdAt || 0)
  );

  const rows = selectedFilter === "Semua"
    ? allRows
    : allRows.filter(([id, order]) =>
        order.status === selectedFilter
      );

  openModal(`
    <h2 id="modal-title">Kelola pesanan</h2>
    <p class="subtext">
      Pantau pesanan, verifikasi pembayaran, dan perbarui statusnya.
    </p>

    <div class="form-field">
      <label for="order-status-filter">Filter status pesanan</label>
      <select id="order-status-filter">
        <option value="Semua"
          ${selectedFilter === "Semua" ? "selected" : ""}>
          Semua pesanan (${allRows.length})
        </option>

        ${orderStatuses.map(status => {
          const count = allRows.filter(
            ([id, order]) => order.status === status
          ).length;

          return `
            <option
              value="${escapeHtml(status)}"
              ${selectedFilter === status ? "selected" : ""}>
              ${escapeHtml(status)} (${count})
            </option>
          `;
        }).join("")}
      </select>
    </div>

    <p class="subtext">
      Menampilkan ${rows.length} dari ${allRows.length} pesanan.
    </p>

    ${
      rows.length
        ? rows.map(([id, order]) => {
            const verified =
              order.paymentStatus === "Terverifikasi admin";

            return `
              <article class="order-card">
                <div class="order-card-head">
                  <strong>
                    #${escapeHtml(id.slice(-6).toUpperCase())}
                    · ${escapeHtml(order.customerName || "Customer")}
                  </strong>

                  <span class="status-pill">
                    ${escapeHtml(statusLabel(order.status))}
                  </span>
                </div>

                <p>
                  ${escapeHtml(order.address || "")}<br>
                  ${escapeHtml(order.paymentMethod || "")}
                  · ${money(order.total)}
                </p>

                <div class="payment-box">
                  <strong>Status pembayaran:</strong>
                  <p>
                    ${escapeHtml(
                      order.paymentStatus ||
                      "Menunggu verifikasi admin"
                    )}
                  </p>

                  ${
                    verified
                      ? `<span>✓ Pembayaran sudah diverifikasi</span>`
                      : `
                        <button
                          class="small-action green"
                          data-verify-payment="${escapeHtml(id)}">
                          Verifikasi pembayaran
                        </button>

                        <small>
                          Pastikan dana benar-benar masuk sebelum
                          memverifikasi pembayaran.
                        </small>
                      `
                  }
                </div>

                ${deliveryProofView(order)}

                <div class="form-field">
                  <label>Status pesanan</label>
                  <select data-order-status="${escapeHtml(id)}">
                    ${orderStatuses.map(status => `
                      <option
                        value="${escapeHtml(status)}"
                        ${order.status === status ? "selected" : ""}>
                        ${escapeHtml(status)}
                      </option>
                    `).join("")}
                  </select>
                </div>

                ${verified && order.status !== "Dibatalkan" ? `
                  <div class="form-field">
                    <label>Driver pengantaran</label>
                    <select data-order-driver="${escapeHtml(id)}">
                      <option value="">${order.driverId ? "Lepas penugasan driver" : "Pilih driver"}</option>
                      ${Object.entries(driverProfiles).map(([uid, driver]) => `
                        <option value="${escapeHtml(uid)}" ${order.driverId === uid ? "selected" : ""}>
                          ${escapeHtml(driver.name || driver.email || uid)}
                        </option>
                      `).join("")}
                    </select>
                    <button class="small-action green" data-assign-driver="${escapeHtml(id)}">Simpan penugasan</button>
                  </div>
                ` : ""}

                <button
                  class="small-action green"
                  data-save-order="${escapeHtml(id)}">
                  Simpan perubahan
                </button>
              </article>
            `;
          }).join("")
        : `<div class="empty-state">Tidak ada pesanan pada status ini.</div>`
    }

    <button class="text-button" id="orders-admin-back">
      Kembali ke admin
    </button>
  `);

  $("#orders-admin-back").addEventListener("click", () => {
    isOrdersModalOpen = false;
    showAdmin();
  });

  $("#order-status-filter").addEventListener("change", event => {
    showManageOrders(event.target.value);
  });

  // Penugasan driver oleh admin
  $("#modal-content")
    .querySelectorAll("[data-assign-driver]")
    .forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.dataset.assignDriver;
        const order = orders[id];
        const driverId = $(`[data-order-driver="${id}"]`).value;
        if (!order) return showToast("Pesanan tidak ditemukan.");
        if (order.paymentStatus !== "Terverifikasi admin") {
          return showToast("Verifikasi pembayaran sebelum menugaskan driver.");
        }
        if (driverId && !driverProfiles[driverId]) {
          return showToast("Driver tidak ditemukan. Muat ulang daftar driver.");
        }
        const driver = driverId ? driverProfiles[driverId] : null;
        try {
          await update(ref(db, `orders/${id}`), {
            driverId: driverId || null,
            driverName: driver?.name || driver?.email || null,
            status: driverId ? "Menunggu driver" : "Pesanan diproses",
            assignedAt: driverId ? Date.now() : null,
            updatedAt: Date.now()
          });
          showToast(driverId ? "Driver berhasil ditugaskan." : "Penugasan driver dilepas.");
          showManageOrders(selectedFilter);
        } catch (error) {
          console.error(error);
          showToast("Gagal menyimpan penugasan. Periksa Firebase Rules.");
        }
      });
    });

  // Verifikasi pembayaran
  $("#modal-content")
    .querySelectorAll("[data-verify-payment]")
    .forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.dataset.verifyPayment;
        const order = orders[id];

        if (!order) {
          showToast("Pesanan tidak ditemukan.");
          return;
        }

        if (order.paymentStatus === "Terverifikasi admin") {
          showToast("Pembayaran sudah diverifikasi.");
          return;
        }

        if (order.status === "Dibatalkan") {
          showToast("Pesanan dibatalkan dan tidak dapat diverifikasi.");
          return;
        }

        if (!window.confirm(
          "Pastikan dana sudah benar-benar masuk. " +
          "Verifikasi pembayaran pesanan ini?"
        )) {
          return;
        }

        try {
          await update(ref(db, `orders/${id}`), {
            paymentStatus: "Terverifikasi admin",
            status: "Pesanan diproses",
            updatedAt: Date.now()
          });

          showToast("Pembayaran berhasil diverifikasi.");
          showManageOrders(selectedFilter);
        } catch (error) {
          console.error(error);
          showToast("Gagal memverifikasi pembayaran.");
        }
      });
    });

  // Simpan perubahan status
  $("#modal-content")
    .querySelectorAll("[data-save-order]")
    .forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.dataset.saveOrder;
        const order = orders[id];

        if (!order) {
          showToast("Pesanan tidak ditemukan.");
          return;
        }

        const status =
          $(`[data-order-status="${id}"]`).value;

        const verified =
          order.paymentStatus === "Terverifikasi admin";

        if (
          !verified &&
          [
            "Pesanan diproses",
            "Menunggu driver",
            "Dalam pengantaran",
            "Selesai"
          ].includes(status)
        ) {
          showToast("Verifikasi pembayaran terlebih dahulu.");
          return;
        }

        if (
          order.status === "Dibatalkan" &&
          status !== "Dibatalkan"
        ) {
          showToast(
            "Pesanan yang dibatalkan tidak dapat diaktifkan kembali dari sini."
          );
          return;
        }

        try {
          await update(ref(db, `orders/${id}`), {
            status,
            updatedAt: Date.now()
          });

          showToast("Pesanan berhasil diperbarui.");
          showManageOrders(selectedFilter);
        } catch (error) {
          console.error(error);
          showToast("Gagal memperbarui pesanan.");
        }
      });
    });
}



function showDriver() {
  if (profile?.role !== "driver" || !currentUser) {
    showToast("Akses khusus driver.");
    return;
  }

  const list = Object.entries(orders || {}).sort(
    (a, b) => (b[1].assignedAt || b[1].createdAt || 0) - (a[1].assignedAt || a[1].createdAt || 0)
  );

  const actionFor = (id, order) => {
    if (order.status === "Menunggu driver") {
      return `<button class="small-action green" data-driver-action="accept" data-order-id="${escapeHtml(id)}">Terima tugas</button>`;
    }
    if (order.status === "Pesanan diterima driver") {
      return `<button class="small-action green" data-driver-action="start" data-order-id="${escapeHtml(id)}">Mulai pengantaran</button>`;
    }
    if (order.status === "Dalam pengantaran") {
      return `<button class="small-action green" data-driver-action="finish" data-order-id="${escapeHtml(id)}">Tandai selesai</button>`;
    }
    if (order.status === "Selesai") return `<span class="driver-complete">✓ Pengantaran selesai</span>`;
    return `<small class="driver-waiting">Status: ${escapeHtml(statusLabel(order.status))}</small>`;
  };

  openModal(`
    <div class="driver-panel-head">
      <div><span class="eyebrow">RASAKITA DELIVERY</span><h2 id="modal-title">Halo, ${escapeHtml(profile.name || "Driver")}!</h2></div>
      <span class="driver-count">${list.length} tugas</span>
    </div>
    <p class="subtext">Daftar pesanan yang ditugaskan admin kepadamu. Perbarui status sesuai proses pengantaran.</p>
    ${list.length ? list.map(([id, order]) => `
      <article class="order-card driver-order-card">
        <div class="order-card-head">
          <strong>#${escapeHtml(id.slice(-6).toUpperCase())}</strong>
          <span class="status-pill">${escapeHtml(statusLabel(order.status))}</span>
        </div>
        <div class="driver-customer"><strong>${escapeHtml(order.customerName || "Pelanggan")}</strong><a href="tel:${escapeHtml(order.phone || "")}">${escapeHtml(order.phone || "Nomor tidak tersedia")}</a></div>
        <p class="driver-address">📍 ${escapeHtml(order.address || "Alamat tidak tersedia")}</p>
        <div class="driver-order-meta"><span>${Object.values(order.items || {}).length} item</span><strong>${money(order.total)}</strong></div>
        <div class="driver-action-row">${actionFor(id, order)}</div>
      </article>
    `).join("") : `<div class="empty-state">Belum ada tugas pengantaran. Pesanan yang ditugaskan admin akan muncul di sini.</div>`}
    <button class="text-button" id="driver-refresh">Muat ulang tugas</button>
    <button class="text-button" id="driver-back">Kembali ke akun</button>
  `);

  $("#driver-back").addEventListener("click", showAccount);
  $("#driver-refresh").addEventListener("click", showDriver);
  $("#modal-content").querySelectorAll("[data-driver-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.orderId;
      const action = button.dataset.driverAction;
      const order = orders[id];
      if (!order || order.driverId !== currentUser.uid) {
        showToast("Tugas tidak ditemukan atau bukan milik akunmu.");
        return;
      }
      const transitions = {
        accept: { from: "Menunggu driver", to: "Pesanan diterima driver", timestamp: "driverAcceptedAt" },
        start: { from: "Pesanan diterima driver", to: "Dalam pengantaran", timestamp: "deliveryStartedAt" },
        finish: { from: "Dalam pengantaran", to: "Selesai", timestamp: "deliveredAt" }
      };
      const transition = transitions[action];
      if (!transition || order.status !== transition.from) {
        showToast("Status pesanan sudah berubah. Muat ulang tugas.");
        return;
      }
      try {
        await update(ref(db, `orders/${id}`), {
          status: transition.to,
          [transition.timestamp]: Date.now(),
          updatedAt: Date.now()
        });
        showToast(action === "finish" ? "Pengantaran selesai. Terima kasih!" : "Status tugas berhasil diperbarui.");
        // Realtime listener updates orders; redraw after the write completes.
        showDriver();
      } catch (error) {
        console.error("Gagal memperbarui tugas driver:", error);
        showToast("Gagal memperbarui status. Periksa Firebase Rules.");
      }
    });
  });
}

