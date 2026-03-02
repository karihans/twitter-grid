// --- ELEMENTLER ---
const gridContainer = document.body;
const purchaseButton = document.getElementById('purchase-button');
const modal = document.getElementById('confirmation-modal');
const closeModalButton = document.getElementById('close-modal');
const submitPurchaseButton = document.getElementById('submit-purchase');
const twitterUsernameInput = document.getElementById('twitter-username');

// --- DURUM (STATE) DEĞİŞKENLERİ ---
let selectedSquare = null;
let isFetchingPrice = false;

// --- AYARLAR ---
const gridSize = 200;
const totalSquares = gridSize * gridSize;
const PRICE_IN_USD = 1.0;

// =================================================================
// YENİ FONKSİYON: Sayfa yüklendiğinde satılmış kareleri getirir ve işaretler
// =================================================================
// YENİ ve GÜNCELLENMİŞ FONKSİYON
async function loadAndMarkSoldSquares() {
  console.log('Satılmış kareler ve profil resimleri yükleniyor...');
  try {
    // API'miz artık pfp url'ini de gönderiyor
    const response = await fetch('/api/get-sold-squares');
    if (!response.ok) {
      throw new Error('Satılmış kare verileri alınamadı.');
    }
    const soldSquares = await response.json(); // [{ square_id: '...', owner_twitter_pfp_url: '...' }, ...]

    soldSquares.forEach(item => {
      const squareElement = document.getElementById(item.square_id);
      if (squareElement) {
        // Eğer resim URL'si varsa, kareye resmi ekle
        if (item.owner_twitter_pfp_url) {
          // Karenin içini temizle (önemli)
          squareElement.innerHTML = ''; 
          
          // Yeni bir resim elementi oluştur
          const pfpImage = document.createElement('img');
          pfpImage.src = item.owner_twitter_pfp_url;
          pfpImage.classList.add('pfp-image'); // Stil vermek için class ekle
          
          // Resmi karenin içine ekle
          squareElement.appendChild(pfpImage);
        }
        
        // Kareyi 'sold' olarak işaretle (tıklamaları engellemek için hala gerekli)
        squareElement.classList.add('sold');
        squareElement.classList.remove('selected');
      }
    });
    console.log(`${soldSquares.length} adet satılmış kare işlendi.`);

  } catch (error) {
    console.error('Satılmış kareler yüklenirken hata:', error);
  }
}


// =================================================================
// Izgarayı oluşturan fonksiyon
// =================================================================
function createGrid() {
    for (let i = 0; i < totalSquares; i++) {
        const square = document.createElement('div');
        square.classList.add('grid-square');
        square.id = `square-${i}`;
        gridContainer.appendChild(square);
    }
}

// =================================================================
// Kareye tıklama olayı
// =================================================================
function handleSquareClick(event) {
    const clickedSquare = event.target;
    // YENİ: Eğer satılmış bir kareye tıklandıysa hiçbir şey yapma
    if (!clickedSquare.classList.contains('grid-square') || clickedSquare.classList.contains('sold')) {
        return;
    }

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

// Diğer fonksiyonlar (handlePurchaseClick, openConfirmationModal, closeModal, handleSubmit) aynı kalabilir.
// Ama kod bütünlüğü için onları da aşağıya ekliyorum.

async function handlePurchaseClick() {
    if (!selectedSquare) {
        alert('Lütfen satın almak için ızgaradan bir kare seçin.');
        return;
    }
    if (!twitterUsernameInput.value) {
        alert('Lütfen Twitter kullanıcı adınızı girin.');
        return;
    }
    if (isFetchingPrice) return;

    isFetchingPrice = true;
    purchaseButton.textContent = 'Fiyat Hesaplanıyor...';
    purchaseButton.disabled = true;

    try {
        const response = await fetch('/api/get-price');
        const priceData = await response.json();
        if (!response.ok) { throw new Error(priceData.message || 'Fiyat alınamadı.'); }
        const tokenPriceInUsd = priceData.price_in_usd;
        const amountOfTokenNeeded = (PRICE_IN_USD / tokenPriceInUsd).toFixed(6);
        openConfirmationModal(twitterUsernameInput.value, amountOfTokenNeeded, priceData.token);
    } catch (error) {
        console.error('Satın alma işlemi sırasında hata:', error);
        alert(`Bir hata oluştu: ${error.message}`);
    } finally {
        isFetchingPrice = false;
        purchaseButton.textContent = 'Satın Al';
        purchaseButton.disabled = false;
    }
}

function openConfirmationModal(username, amount, tokenSymbol) {
    document.getElementById('modal-square-id').textContent = selectedSquare.id;
    document.getElementById('modal-twitter-username').textContent = username;
    const paymentAmountElement = document.querySelector('.payment-info #payment-amount');
    if (paymentAmountElement) {
        paymentAmountElement.textContent = `${amount} ${tokenSymbol}`;
    }
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

async function handleSubmit() {
    const twitterUsername = document.getElementById('modal-twitter-username').textContent;
    const transactionId = document.getElementById('transaction-id').value;
    if (!transactionId) {
        alert('Lütfen ödemeyi yaptıktan sonra işlem kimliğini girin.');
        return;
    }
    submitPurchaseButton.disabled = true;
    submitPurchaseButton.textContent = 'Kaydediliyor...';
    try {
        const response = await fetch('/api/save-square', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                square_id: selectedSquare.id,
                twitter_username: twitterUsername,
                transaction_id: transactionId
            }),
        });
        const result = await response.json();
        if (!response.ok) { throw new Error(result.message || 'Bilinmeyen bir hata oluştu.'); }
        alert('İsteğiniz başarıyla veritabanına kaydedildi!');
        closeModal();
        // handleSubmit fonksiyonunun içindeki 'try' bloğunun sonu...

        alert('İsteğiniz başarıyla veritabanına kaydedildi!');
        closeModal();

        // Bu kısmı güncelliyoruz
        if (selectedSquare) {
            // API'den dönen verinin içinde pfp url'i olmalı
            const pfpUrl = result.data.owner_twitter_pfp_url;

            if (pfpUrl) {
                selectedSquare.innerHTML = ''; // İçini temizle
                const pfpImage = document.createElement('img');
                pfpImage.src = pfpUrl;
                pfpImage.classList.add('pfp-image');
                selectedSquare.appendChild(pfpImage);
            }

            selectedSquare.classList.add('sold');
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
        }
// ... fonksiyonun geri kalanı aynı

    } catch (error) {
        console.error('İstek gönderilirken hata:', error);
        alert(`Hata: ${error.message}`);
    } finally {
        submitPurchaseButton.disabled = false;
        submitPurchaseButton.textContent = 'Onaylıyorum ve İsteği Gönder';
    }
}

// =================================================================
// --- ANA ÇALIŞTIRMA KODU ---
// =================================================================
// --- ANA ÇALIŞTIRMA KODU ---

function initializeApp() {
    console.log('Uygulama başlatılıyor...');
    createGrid();
    loadAndMarkSoldSquares();

    // Olay dinleyicilerini SADECE BİR KEZ burada ekle
    gridContainer.addEventListener('click', handleSquareClick);
    purchaseButton.addEventListener('click', handlePurchaseClick);
    closeModalButton.addEventListener('click', closeModal);
    submitPurchaseButton.addEventListener('click', handleSubmit);
    console.log('Olay dinleyicileri eklendi.');
}

// Bu standart yapı, tüm HTML içeriği yüklendikten sonra
// initializeApp fonksiyonunun SADECE BİR KEZ çalışmasını garanti eder.
document.addEventListener('DOMContentLoaded', initializeApp);
