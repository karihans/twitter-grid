// api/get-price.js

// --- AYARLAR ---
// BONK TOKEN'ININ RESMİ ADRESİ
const TOKEN_ADDRESS = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

// --- ANA API HANDLER ---
export default async function handler(request, response ) {
  try {
    const apiKey = process.env.MORALIS_API_KEY;
    if (!apiKey) {
      throw new Error("Moralis API anahtarı sunucu ortamında ayarlanmamış.");
    }

    // YENİ ve DOĞRU API UÇ NOKTASI (Sizin bulduğunuz)
    const moralisApiUrl = `https://solana-gateway.moralis.io/token/mainnet/${TOKEN_ADDRESS}/price`;

    console.log("Moralis GENEL TOKEN API'sine istek gönderiliyor:", moralisApiUrl );

    const res = await fetch(moralisApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Moralis API'sinden başarısız cevap:", res.status, errorText);
      throw new Error(`Moralis API'si ${res.status} durum koduyla başarısız oldu.`);
    }

    const priceData = await res.json();
    console.log("Moralis'ten gelen cevap:", JSON.stringify(priceData, null, 2));

    // Gelen veriden fiyatı ayıkla. Bu API 'usdPrice' alanını döndürür.
    const priceInUsd = priceData.usdPrice;

    if (priceInUsd === undefined || priceInUsd === null) {
      throw new Error("API cevabında 'usdPrice' alanı bulunamadı.");
    }

    if (typeof priceInUsd !== 'number' || isNaN(priceInUsd)) {
      throw new Error("Alınan fiyat verisi geçerli bir sayı değil.");
    }

    // Bu API sembolü döndürmez, bu yüzden manuel ekleyelim.
    const tokenSymbol = "BONK"; 

    console.log(`Başarıyla alındı: ${tokenSymbol} fiyatı = ${priceInUsd} USD`);

    // Başarılı cevabı gönder
    return response.status(200).json({
      token: tokenSymbol,
      price_in_usd: priceInUsd,
    });

  } catch (error) {
    console.error("get-price API'sinde KÖK HATA:", error);
    return response.status(500).json({
      message: "Token fiyatı alınırken sunucu tarafında bir hata oluştu.",
      error: error.message,
    });
  }
}
