// api/get-price.js

// --- AYARLAR ---
// Kendi Pump.fun token'ınızın adresini buraya yapıştırın
const PUMP_TOKEN_ADDRESS = "NV2RYH954cTJ3ckFUpvfqaQXU4ARqqDH3562nFSpump";

// Bitquery'nin GraphQL uç noktası
const BITQUERY_ENDPOINT = "https://graphql.bitquery.io/";

// --- Bitquery GraphQL Sorgusu ---
// Bu sorgu, token'ın USD cinsinden fiyatını alır.
const GET_TOKEN_PRICE_QUERY = `
  query GetTokenPrice($tokenAddress: String! ) {
    solana(network: solana) {
      dexTrades(
        options: {desc: "block.timestamp.time", limit: 1}
        buyCurrency: {is: $tokenAddress}
      ) {
        block {
          timestamp {
            time(format: "%Y-%m-%d %H:%M:%S")
          }
        }
        transaction {
          signature
        }
        buyAmount
        buyCurrency {
          symbol
          address
        }
        sellAmount
        sellCurrency {
          symbol
          address
        }
        price: tradePrice(in: USD)
      }
    }
  }
`;

// --- API Handler ---
export default async function handler(request, response) {
  try {
    const apiKey = process.env.BITQUERY_API_KEY;
    if (!apiKey) {
      throw new Error("Bitquery API anahtarı sunucu ortamında ayarlanmamış.");
    }

    console.log("Bitquery API'sine istek gönderiliyor...");

    const res = await fetch(BITQUERY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        query: GET_TOKEN_PRICE_QUERY,
        variables: {
          tokenAddress: PUMP_TOKEN_ADDRESS,
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Bitquery API'sinden başarısız cevap:", res.status, errorText);
      throw new Error(`Bitquery API'si ${res.status} durum koduyla başarısız oldu.`);
    }

    const jsonResponse = await res.json();
    console.log("Bitquery'den gelen cevap:", JSON.stringify(jsonResponse, null, 2));

    // Gelen veriden fiyatı ayıkla
    const trades = jsonResponse.data?.solana?.dexTrades;
    if (!trades || trades.length === 0) {
      throw new Error("Token için Bitquery'de işlem bulunamadı. Token adresi doğru mu veya hiç işlem yapıldı mı?");
    }

    const priceInUsd = trades[0].price;
    const tokenSymbol = trades[0].buyCurrency.symbol || "YOUR_TOKEN";

    if (typeof priceInUsd !== 'number') {
      throw new Error("Alınan fiyat verisi geçerli bir sayı değil.");
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
