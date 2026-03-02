// Bu satır, fonksiyonun Edge Runtime'da çalışmasını sağlar. Bu kritik.
export const config = {
  runtime: 'edge',
};

// Edge fonksiyonları sadece 'request' parametresini alır. 'response' yoktur.
export default async function handler(request) {
  try {
    const apiUrl = 'https://price.jup.ag/v4/price?ids=SOL&vsToken=USDC';

    // fetch işlemi aynı kalır.
    const apiResponse = await fetch(apiUrl );

    if (!apiResponse.ok) {
      // Hata mesajını daha bilgilendirici yapalım.
      const errorText = await apiResponse.text();
      throw new Error(`Jupiter API Error (${apiResponse.status}): ${errorText}`);
    }

    const data = await apiResponse.json();
    const solPrice = data.data.SOL.price;

    // Başarılı cevap, 'new Response' ile oluşturulur. Bu doğru yöntem.
    return new Response(
      JSON.stringify({
        token: 'SOL',
        price_in_usd: solPrice,
        message: `1 SOL anlık olarak ${solPrice} USDC değerindedir.`
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=60, stale-while-revalidate', // Fiyatı 60 saniye cache'le
        },
      }
    );

  } catch (error) {
    // Hataları yakalayıp loglamak çok önemlidir.
    console.error('API Hatası:', error);

    // Hata durumunda da 'new Response' ile cevap oluşturulur.
    return new Response(
      JSON.stringify({
        message: 'Token fiyatı alınırken bir hata oluştu.',
        error: error.message,
      }),
      {
        status: 500, // Sunucu hatası olduğunu belirtir.
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
