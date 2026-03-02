import { createClient } from '@supabase/supabase-js';

// Supabase istemcisini, Vercel'in ortam değişkenlerini kullanarak oluşturuyoruz.
// Bu kod sunucu tarafında çalıştığı için 'process.env' burada doğru ve güvenli bir şekilde çalışır.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(request, response) {
  // Güvenlik: Sadece POST isteklerini kabul et
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // İstekle gelen veriyi (square_id, twitter_username vb.) al
    const { square_id, twitter_username, transaction_id } = request.body;

    // Veritabanına yeni bir satır ekle
    const { data, error } = await supabase
      .from('squares')
      .insert([{ square_id, owner_twitter_username: twitter_username, transaction_id }])
      .select() // Eklenen veriyi geri döndür
      .single(); // Tek bir satır beklediğimizi belirtir

    // Eğer Supabase bir hata döndürürse
    if (error) {
      console.error('Supabase Error:', error);
      // unique_violation hatası (aynı kare tekrar satılırsa)
      if (error.code === '23505') {
        return response.status(409).json({ message: 'Bu kare daha önce satın alınmış.' }); // 409 Conflict
      }
      // Diğer veritabanı hataları
      return response.status(500).json({ message: 'Veritabanı hatası.', error: error.message });
    }

    // Her şey yolundaysa, başarılı cevabı gönder
    return response.status(200).json({ message: 'Kare başarıyla kaydedildi.', data: data });

  } catch (e) {
    console.error('Handler Error:', e);
    return response.status(500).json({ message: 'Sunucuda beklenmedik bir hata oluştu.' });
  }
}
