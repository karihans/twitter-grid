// api/get-price.js

// --- AYARLAR ---
// Kendi Pump.fun token'ınızın adresini buraya yapıştırın
const PUMP_TOKEN_ADDRESS = "ctQPRPpLY52CeEfmJqUEhYQ6SmMVHitkU3KKEDUpump";

// --- API Handler ---
export default async function handler(request, response) {
  try {
    const apiKey = process.env.MORALIS_API_KEY;
    if (!apiKey) {
      throw new Error("Moralis API anahtarı sunucu ortamında ayarlanmamış.");
    }

    // Moralis'in Pump.fun token bilgisi için API uç noktası
    const moralisApiUrl = `https://solana-gateway.moralis.io/pump/v1/token/${PUMP_TOKEN_ADDRESS}`;

    console.log("Moralis API'sine istek gönderiliyor:", moralisApiUrl );

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

    const tokenData = await res.json();
    console.log("Moralis'ten gelen cevap:", JSON.stringify(tokenData, null, 2));

    // Gelen veriden fiyatı ve sembolü ayıkla
    // Moralis fiyatı doğrudan USD cinsinden 'usd_market_cap' / 'total_supply' olarak hesaplar
    // veya doğrudan bir fiyat alanı sunabilir. Dönen veriye göre ayarlama yapalım.
    // Dökümana göre, 'market_cap_usd' ve 'total_supply' alanları var.
    
    const marketCapUsd = parseFloat(tokenData.market_cap_usd);
    const totalSupply = parseFloat(tokenData.total_supply);

    if (!marketCapUsd || !totalSupply || totalSupply === 0) {
      throw new Error("API cevabında fiyat hesaplamak için gerekli veri (market_cap_usd, total_supply) bulunamadı.");
    }

    // Fiyatı hesapla: Market Cap / Total Supply
    const priceInUsd = marketCapUsd / totalSupply;
    const tokenSymbol = tokenData.symbol || "YOUR_TOKEN";

    if (typeof priceInUsd !== 'number' || isNaN(priceInUsd)) {
      throw new Error("Hesaplanan fiyat verisi geçerli bir sayı değil.");
    }

    // Başarılı cevabı gönder
    return response.status(200).json({
      token: tokenSymbol,
      price_in_usd: priceInUsd,
    });

  } catch (error) {
    console.error("get-price API'sinde hata:", error);
    return response.status(500).json({
      message: "Token fiyatı alınırken sunucu tarafında bir hata oluştu.",
      error: error.message,
    });
  }
}
