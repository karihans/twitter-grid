import { Connection, PublicKey } from '@solana/web3.js';
import { LIQUIDITY_STATE_LAYOUT_V4, MARKET_STATE_LAYOUT_V3 } from '@raydium-io/raydium-sdk'; // Raydium SDK'sını kullanacağız çünkü Pump Swap havuzları benzer bir yapı kullanır.

// --- AYARLAR ---
const PUMP_TOKEN_ADDRESS = "ctQPRPpLY52CeEfmJqUEhYQ6SmMVHitkU3KKEDUpump";
const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";

const SOLANA_RPC_URL = process.env.HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com";

// --- YARDIMCI FONKSİYONLAR ---
async function getSolPriceInUsd( ) {
    try {
        const response = await fetch('https://price.jup.ag/v4/price?ids=SOL&vsToken=USDC' );
        if (!response.ok) throw new Error('Jupiter API for SOL price failed');
        const data = await response.json();
        return data.data.SOL.price;
    } catch (error) {
        console.error("SOL/USD fiyatı alınamadı:", error);
        throw new Error("SOL/USD fiyatı alınamadı.");
    }
}

// --- ANA API HANDLER ---
export default async function handler(request, response) {
    try {
        console.log("RPC İsteği Başlatıldı. RPC URL:", SOLANA_RPC_URL);
        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
        const tokenMint = new PublicKey(PUMP_TOKEN_ADDRESS);

        // Raydium'un program adresini kullanarak token'ın likidite havuzlarını ara
        const RAYDIUM_LIQUIDITY_PROGRAM_ID_V4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
        
        const accounts = await connection.getProgramAccounts(RAYDIUM_LIQUIDITY_PROGRAM_ID_V4, {
            filters: [
                { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
                { memcmp: { offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'), bytes: tokenMint.toBase58() } },
                { memcmp: { offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'), bytes: SOL_MINT_ADDRESS } }
            ]
        });
        
        // Alternatif arama (base ve quote yer değiştirmiş olabilir)
        if (accounts.length === 0) {
             const altAccounts = await connection.getProgramAccounts(RAYDIUM_LIQUIDITY_PROGRAM_ID_V4, {
                filters: [
                    { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
                    { memcmp: { offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'), bytes: SOL_MINT_ADDRESS } },
                    { memcmp: { offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'), bytes: tokenMint.toBase58() } }
                ]
            });
            accounts.push(...altAccounts);
        }

        if (accounts.length === 0) {
            throw new Error("Bu token için Raydium/Pump Swap üzerinde bir likidite havuzu bulunamadı.");
        }

        // Havuz hesabından veriyi çöz
        const poolInfo = LIQUIDITY_STATE_LAYOUT_V4.decode(accounts[0].account.data);

        const solReserve = poolInfo.quoteVaultAmount;
        const tokenReserve = poolInfo.baseVaultAmount;

        console.log("Gerçek SOL Rezervi:", solReserve.toString());
        console.log("Gerçek Token Rezervi:", tokenReserve.toString());

        if (tokenReserve.isZero()) {
            throw new Error("Likidite havuzunda token rezervi sıfır.");
        }

        // Fiyatı hesapla (SOL/TOKEN)
        const priceInSol = parseFloat(solReserve.toString()) / parseFloat(tokenReserve.toString());

        const solPriceUsd = await getSolPriceInUsd();
        const priceInUsd = priceInSol * solPriceUsd;

        console.log("Hesaplanan USD Fiyatı:", priceInUsd);

        const tokenSymbol = "YOUR_TOKEN"; // Kendi token sembolünüzü buraya yazın

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
