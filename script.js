// --- ELEMENTLER ---
const gridContainer = document.body;
const purchaseButton = document.getElementById('purchase-button');
const modal = document.getElementById('confirmation-modal');
const closeModalButton = document.getElementById('close-modal');
const submitPurchaseButton = document.getElementById('submit-purchase');
const twitterUsernameInput = document.getElementById('twitter-username');

// --- DURUM (STATE) DEĞİŞKENLERİ ---
let selectedSquare = null;
let isFetchingPrice = false; // Fiyat alınırken tekrar butona basılmasını engellemek için

// --- AYARLAR ---
const gridSize = 200;
const totalSquares = gridSize * gridSize;
const PRICE_IN_USD = 1.0; // Her karenin USD cinsinden fiyatı

// --- FONKSİYONLAR ---

function createGrid() {
    for (let i = 0; i < totalSquares; i++) {
        const square = document.createElement('div');
        square.classList.add('grid-square');
        square.id = `square-${i}`;
        gridContainer.appendChild(square);
    }
}

function handleSquareClick(event) {
    const clickedSquare = event.target;
    if (!clickedSquare.classList.contains('grid-square')) return;

    if (selectedSquare) {
        selectedSquare.classList.remove('selected');
    }

    if (selectedSquare === clickedSquare) {
        selectedSquare = null;
    } else {
        selectedSquare = clickedSquare;
        selectedSquare.classList.add('selected');
    }
}

// "Satın Al" butonuna tıklandığında çalışan ANA FONKSİYON
async function handlePurchaseClick() {
    if (!selectedSquare) {
        alert('Lütfen satın almak için ızgaradan bir kare seçin.');
        return;
    }
    if (!twitterUsernameInput.value) {
        alert('Lütfen Twitter kullanıcı adınızı girin.');
        return;
    }
    if (isFetchingPrice) return; // Zaten fiyat alınıyorsa, tekrar çalıştırma

    isFetchingPrice = true;
    purchaseButton.textContent = 'Fiyat Hesaplanıyor...';
    purchaseButton.disabled = true;

    try {
        // 1. Kendi API'mizi çağırarak anlık fiyatı al
        const response = await fetch('/api/get-price');
        const priceData = await response.json();

        if (!response.ok) {
            throw new Error(priceData.message || 'Fiyat alınamadı.');
        }

        const tokenPriceInUsd = priceData.price_in_usd;
        
        // 2. 1 USD'nin kaç token ettiğini hesapla
        // Kendi token'ınız SOL değilse, buradaki mantık değişecek. Şimdilik SOL varsayıyoruz.
        const amountOfTokenNeeded = (PRICE_IN_USD / tokenPriceInUsd).toFixed(6); // Virgülden sonra 6 basamak

        // 3. Onay modalını bu bilgilerle aç
        openConfirmationModal(twitterUsernameInput.value, amountOfTokenNeeded, priceData.token);

    } catch (error) {
        console.error('Satın alma işlemi sırasında hata:', error);
        alert(`Bir hata oluştu: ${error.message}`);
    } finally {
        // İşlem bitince butonu eski haline getir
        isFetchingPrice = false;
        purchaseButton.textContent = 'Satın Al';
        purchaseButton.disabled = false;
    }
}

// Onay modalını açan ve bilgileri dolduran fonksiyon
function openConfirmationModal(username, amount, tokenSymbol) {
    document.getElementById('modal-square-id').textContent = selectedSquare.id;
    document.getElementById('modal-twitter-username').textContent = username;
    
    // Yeni eklenen ödeme miktarı alanı
    const paymentAmountElement = document.querySelector('.payment-info #payment-amount');
    if (paymentAmountElement) {
        paymentAmountElement.textContent = `${amount} ${tokenSymbol}`;
    }
    
    modal.classList.remove('hidden');
}

// ... (Diğer fonksiyonlar aynı kalabilir, ama temizlik için hepsini veriyorum) ...

function closeModal() {
    modal.classList.add('hidden');
}

function handleSubmit() {
    const twitterUsername = document.getElementById('modal-twitter-username').textContent;
    const transactionId = document.getElementById('transaction-id').value;

    console.log(`SATIN ALMA İSTEĞİ ONAYLANDI:
        Seçilen Kare: ${selectedSquare.id},
        Twitter: ${twitterUsername},
        TX ID: ${transactionId}`);

    alert('İsteğiniz başarıyla alındı! Onay sonrası kareniz güncellenecektir.');
    closeModal();
    
    if (selectedSquare) {
        selectedSquare.classList.remove('selected');
        selectedSquare = null;
    }
}

// --- OLAY DİNLEYİCİLERİ ---
createGrid();
gridContainer.addEventListener('click', handleSquareClick);
purchaseButton.addEventListener('click', handlePurchaseClick);
closeModalButton.addEventListener('click', closeModal);
submitPurchaseButton.addEventListener('click', handleSubmit);
