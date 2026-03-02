// --- ELEMENTLER ---
const gridContainer = document.body;
const purchaseButton = document.getElementById('purchase-button');
const modal = document.getElementById('confirmation-modal');
const closeModalButton = document.getElementById('close-modal');
const submitPurchaseButton = document.getElementById('submit-purchase');

// --- DURUM (STATE) DEĞİŞKENLERİ ---
let selectedSquare = null; // Seçili olan kare elementini tutar

// --- AYARLAR ---
const gridSize = 200;
const totalSquares = gridSize * gridSize;

// --- FONKSİYONLAR ---

// Izgarayı oluşturan fonksiyon
function createGrid() {
    for (let i = 0; i < totalSquares; i++) {
        const square = document.createElement('div');
        square.classList.add('grid-square');
        square.id = `square-${i}`;
        gridContainer.appendChild(square);
    }
}

// Bir kareye tıklandığında çalışan fonksiyon
function handleSquareClick(event) {
    const clickedSquare = event.target;
    if (!clickedSquare.classList.contains('grid-square')) return;

    // Eğer zaten bir kare seçiliyse, onun vurgusunu kaldır
    if (selectedSquare) {
        selectedSquare.classList.remove('selected');
    }

    // Eğer aynı kareye tekrar tıklandıysa seçimi iptal et
    if (selectedSquare === clickedSquare) {
        selectedSquare = null;
    } else {
        // Yeni kareyi seç ve vurgula
        selectedSquare = clickedSquare;
        selectedSquare.classList.add('selected');
    }
}

// "Satın Al" butonuna tıklandığında çalışan fonksiyon
function handlePurchaseClick() {
    const twitterUsername = document.getElementById('twitter-username').value;

    // 1. Bir kare seçilmiş mi?
    if (!selectedSquare) {
        alert('Lütfen satın almak için ızgaradan bir kare seçin.');
        return;
    }

    // 2. Twitter kullanıcı adı girilmiş mi?
    if (!twitterUsername) {
        alert('Lütfen Twitter kullanıcı adınızı girin.');
        return;
    }

    // Bilgiler tamamsa, onay modalını göster
    openConfirmationModal(twitterUsername);
}

// Onay modalını açan ve bilgileri dolduran fonksiyon
function openConfirmationModal(username) {
    document.getElementById('modal-square-id').textContent = selectedSquare.id;
    document.getElementById('modal-twitter-username').textContent = username;
    modal.classList.remove('hidden');
}

// Modal penceresini kapatan fonksiyon
function closeModal() {
    modal.classList.add('hidden');
}

// Son onayı ve isteği gönderen fonksiyon
function handleSubmit() {
    const twitterUsername = document.getElementById('modal-twitter-username').textContent;
    const transactionId = document.getElementById('transaction-id').value;

    console.log(`
        SATIN ALMA İSTEĞİ ONAYLANDI:
        -----------------------------
        Seçilen Kare: ${selectedSquare.id}
        Twitter Kullanıcı Adı: ${twitterUsername}
        İşlem Kimliği: ${transactionId}
    `);

    alert('İsteğiniz başarıyla alındı! Onay sonrası kareniz güncellenecektir.');
    closeModal();
    
    // İsteği gönderdikten sonra seçimi temizle
    if (selectedSquare) {
        selectedSquare.classList.remove('selected');
        selectedSquare = null;
    }
}

// --- OLAY DİNLEYİCİLERİ ---

createGrid(); // Sayfa açıldığında ızgarayı oluştur
gridContainer.addEventListener('click', handleSquareClick); // Izgaradaki tıklamaları dinle
purchaseButton.addEventListener('click', handlePurchaseClick); // "Satın Al" butonunu dinle
closeModalButton.addEventListener('click', closeModal); // Modal kapatma butonunu dinle
submitPurchaseButton.addEventListener('click', handleSubmit); // Son onay butonunu dinle
