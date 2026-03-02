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
let soldSquaresData = {}; // Satılmış karelerin verisini saklar (örn: { 'square-123': { owner: 'elonmusk' } })

// --- AYARLAR ---
const gridSize = 200;
const totalSquares = gridSize * gridSize;
const PRICE_IN_USD = 1.0;

// =================================================================
// FONKSİYONLAR
// =================================================================

// Sayfa yüklendiğinde satılmış kareleri getirir ve işaretler
async function loadAndMarkSoldSquares() {
    console.log('Satılmış kareler ve profil resimleri yükleniyor...');
    try {
        const response = await fetch('/api/get-sold-squares');
        if (!response.ok) {
            throw new Error('Satılmış kare verileri alınamadı.');
        }
        const soldSquares = await response.json();

        // Sayaç elementini bul ve güncelle
        const soldCountElement = document.getElementById('sold-count');
        if (soldCountElement) {
            soldCountElement.textContent = soldSquares.length;
        }

        // Gelen her bir satılmış kare verisi için
        soldSquares.forEach(item => {
            // Gelen veriyi global objemize kaydedelim
            soldSquaresData[item.square_id] = {
                owner: item.owner_twitter_username
            };

            const squareElement = document.getElementById(item.square_id);
            if (squareElement) {
                if (item.owner_twitter_pfp_url) {
                    squareElement.innerHTML = '';
                    const pfpImage = document.createElement('img');
                    pfpImage.src = item.owner_twitter_pfp_url;
                    pfpImage.classList.add('pfp-image');
                    squareElement.appendChild(pfpImage);
                }
                squareElement.classList.add('sold');
                squareElement.classList.remove('selected');
            }
        });
        console.log(`${soldSquares.length} adet satılmış kare işlendi.`);

    } catch (error) {
        console.error('Satılmış kareler yüklenirken hata:', error);
    }
}

// Izgarayı oluşturan fonksiyon
function createGrid() {
    for (let i = 0; i < totalSquares; i++) {
        const square = document.createElement('div');
        square.classList.add('grid-square');
        square.id = `square-${i}`;
        gridContainer.appendChild(square);
    }
}

// Kareye tıklama olayı
function handleSquareClick(event) {
    const clickedSquare = event.target.closest('.grid-square');
    if (!clickedSquare) return;

    // Eğer satılmış bir kareye tıklandıysa, sahibini göster
    if (clickedSquare.classList.contains('sold')) {
        const squareId = clickedSquare.id;
        const squareData = soldSquaresData[squareId];
        if (squareData && squareData.owner) {
            alert(`Bu kare @${squareData.owner} tarafından satın alınmıştır.`);
        }
        return;
    }

    // Seçimle ilgili kodlar
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

// "Satın Al" butonuna tıklandığında çalışan fonksiyon
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

// Onay modalını açan ve bilgileri dolduran fonksiyon
function openConfirmationModal(username, amount, tokenSymbol) {
    document.getElementById('modal-square-id').textContent = selectedSquare.id;
    document.getElementById('modal-twitter-username').textContent = username;
    const paymentAmountElement = document.querySelector('.payment-info #payment-amount');
    if (paymentAmountElement) {
        paymentAmountElement.textContent = `${amount} ${tokenSymbol}`;
    }
    modal.classList.remove('hidden');
}

// Modal penceresini kapatan fonksiyon
function closeModal() {
    modal.classList.add('hidden');
}

// Son onayı ve isteği gönderen fonksiyon (Çift tıklama engelli)
async function handleSubmit() {
    submitPurchaseButton.removeEventListener('click', handleSubmit);
    submitPurchaseButton.disabled = true;
    submitPurchaseButton.textContent = 'Kaydediliyor...';

    try {
        const twitterUsername = document.getElementById('modal-twitter-username').textContent;
        const transactionId = document.getElementById('transaction-id').value;

        if (!transactionId) {
            alert('Lütfen ödemeyi yaptıktan sonra işlem kimliğini girin.');
            return;
        }

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

        // Sayacı bir artır
        const soldCountElement = document.getElementById('sold-count');
        if (soldCountElement) {
            soldCountElement.textContent = parseInt(soldCountElement.textContent || '0') + 1;
        }

        // Yeni veriyi global state'e ekle
        soldSquaresData[selectedSquare.id] = { owner: twitterUsername };

        if (selectedSquare) {
            const pfpUrl = result.data.owner_twitter_pfp_url;
            if (pfpUrl) {
                selectedSquare.innerHTML = '';
                const pfpImage = document.createElement('img');
                pfpImage.src = pfpUrl;
                pfpImage.classList.add('pfp-image');
                selectedSquare.appendChild(pfpImage);
            }
            selectedSquare.classList.add('sold');
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
        }

    } catch (error) {
        console.error('İstek gönderilirken hata:', error);
        alert(`Hata: ${error.message}`);
    } finally {
        submitPurchaseButton.disabled = false;
        submitPurchaseButton.textContent = 'Onaylıyorum ve İsteği Gönder';
        setTimeout(() => {
            submitPurchaseButton.addEventListener('click', handleSubmit);
        }, 100);
    }
}

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
