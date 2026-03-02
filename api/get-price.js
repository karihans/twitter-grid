// Bu fonksiyon, Jupiter API'sini kullanarak bir token'ın anlık fiyatını getirir.
export const config = {
  runtime: 'edge',
};

export default async function handler(request, response) {
  try {
    // Jupiter'in fiyat API'sinin adresi.
    // ?ids=SOL&vsToken=USDC -> SOL'un fiyatını USDC cinsinden istiyoruz.
    const apiUrl = 'https://price.jup.ag/v4/price?ids=SOL&vsToken=USDC';

    // Jupiter API'sine bir istek gönderiyoruz.
    const apiResponse = await fetch(apiUrl );

    // Eğer API'den başarılı bir cevap gelmezse, hata fırlat.
    if (!apiResponse.ok) {
      throw new Error(`Jupiter API'den hata alındı: ${apiResponse.statusText}`);
    }

    // Gelen cevabı JSON formatına çeviriyoruz.
    const data = await await apiResponse.json();

    // Gelen veriden fiyat bilgisini alıyoruz.
    // Örnek veri: { data: { SOL: { price: 135.12, ... } }, ... }
    const solPrice = data.data.SOL.price;

    // Her şey yolundaysa, istemciye (tarayıcıya) fiyat bilgisini gönder.
    response.status(200).json({
      token: 'SOL',
      price_in_usd: solPrice,
      message: `1 SOL anlık olarak ${solPrice} USDC değerindedir.`
    });

  } catch (error) {
    // Eğer bir hata oluşursa (API'ye ulaşılamazsa vb.),
    // hatayı konsola yaz ve istemciye bir hata mesajı gönder.
    console.error('Fiyat alınırken bir hata oluştu:', error);
    response.status(500).json({
      message: 'Token fiyatı alınırken sunucu tarafında bir hata oluştu.',
      error: error.message
    });
  }
}
