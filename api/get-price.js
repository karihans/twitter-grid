// api/get-price.js

// --- AYARLAR ---
// BONK TOKEN'ININ RESMİ ADRESİ
const TOKEN_ADDRESS = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

// Jupiter'in herkese açık ve anahtarsız fiyat API'si uç noktası
const JUPITER_PRICE_API = `https://price.jup.ag/v4/price?ids=${TOKEN_ADDRESS}`;

// --- ANA API HANDLER ---
export default async function handler(request, response ) {
  try {
    console.log("Jupiter API'sine istek gönderiliyor:", JUPITER_PRICE_API);

    const res = await fetch(JUPITER_PRICE_API);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Jupiter API'sinden başarısız cevap:", res.status, errorText);
      throw new Error(`Jupiter API'si ${res.status} durum koduyla başarısız oldu.`);
    }

    const result = await res.json();
    console.log("Jupiter'den gelen cevap:", JSON.stringify(result, null, 2));

    // Gelen verinin yapısını dikkatlice kontrol et
    if (!result.data || !result.data[TOKEN_ADDRESS]) {
      throw new Error("API cevabında beklenen token verisi bulunamadı. Jupiter bu token'ı henüz endekslememiş olabilir.");
    }

    const tokenData = result.data[TOKEN_ADDRESS];
    const priceInUsd = tokenData.price;

    if (typeof priceInUsd !== 'number') {
      throw new Error("Alınan fiyat verisi geçerli bir sayı değil.");
    }

    // Jupiter genellikle sembolü de döndürür, onu kullanalım
    const tokenSymbol = tokenData.mintSymbol || "BONK";

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
