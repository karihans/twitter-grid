import { createClient } from '@supabase/supabase-js';

// Supabase istemcisini oluştur
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(request, response) {
  // Sadece GET isteklerini kabul et
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Supabase'den veri çekme işlemi
    // 'squares' tablosundan sadece 'square_id' sütununu seçiyoruz.
    // Bize şimdilik sadece hangi karelerin satıldığı bilgisi lazım.
    const { data, error } = await supabase
      .from('squares')
      .select('square_id, owner_twitter_pfp_url'); // Bu satırı güncelleyin

    // Eğer Supabase bir hata döndürürse
    if (error) {
      console.error('Supabase Select Error:', error);
      return response.status(500).json({ message: 'Veritabanından veri çekilirken hata oluştu.', error: error.message });
    }

    // Her şey yolundaysa, satılmış karelerin listesini gönder
    // data şöyle bir formatta olacak: [{ square_id: 'square-123' }, { square_id: 'square-456' }]
    return response.status(200).json(data);

  } catch (e) {
    console.error('Handler Error:', e);
    return response.status(500).json({ message: 'Sunucuda beklenmedik bir hata oluştu.' });
  }
}
