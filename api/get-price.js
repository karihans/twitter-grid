// Fonksiyonun Edge Runtime'da çalışmasını sağlar.
export const config = {
  runtime: 'edge',
};

// Edge fonksiyonları sadece 'request' parametresini alır.
export default async function handler(request) {
  try {
    // YENİ API ADRESİ: CoinGecko
    // Bize Solana'nın anlık USD fiyatını verecek.
    const apiUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

    const apiResponse = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      }
    } );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`CoinGecko API Error (${apiResponse.status}): ${errorText}`);
    }

    const data = await apiResponse.json();
    
    // CoinGecko'dan gelen veri yapısı farklıdır: { "solana": { "usd": 135.12 } }
    const solPrice = data.solana.usd;

    if (solPrice === undefined) {
      throw new Error('CoinGecko cevabında fiyat bilgisi bulunamadı.');
    }

    // Başarılı cevap
    return new Response(
      JSON.stringify({
        source: 'CoinGecko', // Kaynağı belirtelim
        token: 'SOL',
        price_in_usd: solPrice,
        message: `1 SOL anlık olarak ${solPrice} USD değerindedir.`
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=60, stale-while-revalidate',
        },
      }
    );

  } catch (error) {
    console.error('API Hatası:', error);

    // Hata cevabı
    return new Response(
      JSON.stringify({
        message: 'Token fiyatı alınırken bir hata oluştu.',
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
