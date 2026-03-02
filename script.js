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
let soldSquaresData = {}; // Satılmış karelerin verisini saklar

// --- AYARLAR ---
const gridSize = 200;
const totalSquares = gridSize * gridSize;
const PRICE_IN_USD = 1.0;

// =================================================================
// FONKSİYONLAR
// =================================================================

async function loadAndMarkSoldSquares() {
    console.log('Satılmış kareler ve profil resimleri yükleniyor...');
    try {
        const response = await fetch('/api/get-sold-squares');
        if (!response.ok) { throw new Error('Satılmış kare verileri alınamadı.'); }
        const soldSquares = await response.json();

        const soldCountElement = document.getElementById('sold-count');
        if (soldCountElement) {
            soldCountElement.textContent = soldSquares.length;
        }

        soldSquares.forEach(item => {
            if(item.square_id && item.owner_twitter_username) {
                soldSquaresData[item.square_id] = { owner: item.owner_twitter_username };
            }

            const squareElement = document.getElementById(item.square_id);
            if (squareElement) {
                if (item.owner_twitter_pfp_url && item.owner_twitter_username) {
                    squareElement.innerHTML = '';
                    
                    // YENİ: Link elementi (<a>) oluştur
                    const link = document.createElement('a');
                    link.href = `https://twitter.com/${item.owner_twitter_username}`;
                    link.target = '_blank'; // Linkin yeni sekmede açılması için
                    link.rel = 'noopener noreferrer'; // Güvenlik için

                    const pfpImage = document.createElement('img' );
                    pfpImage.src = item.owner_twitter_pfp_url;
                    pfpImage.classList.add('pfp-image');
                    
                    // Resmi linkin içine koy
                    link.appendChild(pfpImage);
                    // Linki de karenin içine koy
                    squareElement.appendChild(link);
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

function createGrid() {
    for (let i = 0; i < totalSquares; i++) {
        const square = document.createElement('div');
        square.classList.add('grid-square');
        square.id = `square-${i}`;
        gridContainer.appendChild(square);
    }
}

function handleSquareClick(event) {
    const clickedSquare = event.target.closest('.grid-square');
    if (!clickedSquare) return;

    // Eğer satılmış bir kareye tıklandıysa, artık bir şey yapmaya gerek yok
    // çünkü link kendi işini yapacak. İsterseniz bilgi penceresini yine de gösterebiliriz.
    if (clickedSquare.classList.contains('sold')) {
        // const squareId = clickedSquare.id;
        // const squareData = soldSquaresData[squareId];
        // if (squareData && squareData.owner) {
        //     // İsteğe bağlı: alert(`Bu kare @${squareData.owner} tarafından satın alınmıştır.`);
        // }
        return; // Linkin çalışmasına izin ver, fonksiyonu bitir.
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

async function handlePurchaseClick() {
    if (!selectedSquare) { alert('Lütfen satın almak için ızgaradan bir kare seçin.'); return; }
    if (!twitterUsernameInput.value) { alert('Lütfen Twitter kullanıcı adınızı girin.'); return; }
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
    submitPurchaseButton.removeEventListener('click', handleSubmit);
    submitPurchaseButton.disabled = true;
    submitPurchaseButton.textContent = 'Kaydediliyor...';

    try {
        const twitterUsername = document.getElementById('modal-twitter-username').textContent;
        const transactionId = document.getElementById('transaction-id').value;

        if (!transactionId) { alert('Lütfen ödemeyi yaptıktan sonra işlem kimliğini girin.'); return; }

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

        const soldCountElement = document.getElementById('sold-count');
        if (soldCountElement) {
            soldCountElement.textContent = parseInt(soldCountElement.textContent || '0') + 1;
        }

        if(selectedSquare) {
            soldSquaresData[selectedSquare.id] = { owner: twitterUsername };
        }

        if (selectedSquare) {
            const pfpUrl = result.data.owner_twitter_pfp_url;
            if (pfpUrl) {
                selectedSquare.innerHTML = '';
                
                // YENİ: Yeni satılan kare için de link oluştur
                const link = document.createElement('a');
                link.href = `https://twitter.com/${twitterUsername}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';

                const pfpImage = document.createElement('img' );
                pfpImage.src = pfpUrl;
                pfpImage.classList.add('pfp-image');
                
                link.appendChild(pfpImage);
                selectedSquare.appendChild(link);
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

function initializeApp() {
    console.log('Uygulama başlatılıyor...');
    createGrid();
    loadAndMarkSoldSquares();

    gridContainer.addEventListener('click', handleSquareClick);
    purchaseButton.addEventListener('click', handlePurchaseClick);
    closeModalButton.addEventListener('click', closeModal);
    submitPurchaseButton.addEventListener('click', handleSubmit);
    console.log('Olay dinleyicileri eklendi.');
}

document.addEventListener('DOMContentLoaded', initializeApp);
