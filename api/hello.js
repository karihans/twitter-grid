// Bu, bir Vercel sunucusuz fonksiyonudur.
// Gelen isteklere (request) cevap (response) vermek için kullanılır.

export default function handler(request, response) {
  // Cevap olarak bir JSON objesi gönderiyoruz.
  // Status 200, her şeyin yolunda olduğu anlamına gelir.
  response.status(200).json({
    message: "Arka uçtan merhaba! API fonksiyonunuz başarıyla çalışıyor."
  });
}
