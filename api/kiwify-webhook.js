import admin from "firebase-admin";

export default async function handler(req, res) {
  try {
    // 🔍 Depuração: listar variáveis do ambiente
    const vars = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY:
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_PRIVATE_KEY.startsWith("-----BEGIN")
          ? "✅ OK (detectada)"
          : "❌ AUSENTE ou mal formatada",
      FIREBASE_DB_URL: process.env.FIREBASE_DB_URL,
    };

    console.log("🧪 Variáveis carregadas:", vars);

    // ⚠️ Verificação das variáveis essenciais
    if (!process.env.FIREBASE_PROJECT_ID)
      throw new Error("❌ Variável FIREBASE_PROJECT_ID ausente!");
    if (!process.env.FIREBASE_CLIENT_EMAIL)
      throw new Error("❌ Variável FIREBASE_CLIENT_EMAIL ausente!");
    if (!process.env.FIREBASE_PRIVATE_KEY)
      throw new Error("❌ Variável FIREBASE_PRIVATE_KEY ausente!");
    if (!process.env.FIREBASE_DB_URL)
      throw new Error("❌ Variável FIREBASE_DB_URL ausente!");

    // ✅ Inicializa o Firebase apenas uma vez
    if (!admin.apps.length) {
      console.log("🚀 Inicializando Firebase...");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.FIREBASE_DB_URL,
      });
      console.log("✅ Firebase inicializado com sucesso!");
    }

    // 🔹 Teste rápido via GET (não grava nada)
    if (req.method !== "POST") {
      console.log("⚙️ Endpoint acessado com GET - OK");
      return res
        .status(200)
        .json({ message: "Método não permitido (GET test OK)" });
    }

    // 🧩 Normaliza o payload recebido
    const payload = req.body.data || req.body;
    console.log("📦 Payload recebido:", payload);

    // 🕵️‍♂️ Detecta campos padrões da Kiwify
    const status =
      payload.status ||
      payload.payment_status ||
      payload.event ||
      req.body.status;

    const email =
      payload.email ||
      payload.buyer_email ||
      payload.customer_email ||
      (payload.client && payload.client.email);

    if (!email) {
      console.error("❌ Nenhum email encontrado no payload!");
      return res.status(400).json({
        error: true,
        message: "Email não encontrado no corpo do webhook",
        payload,
      });
    }

    // 💰 Verifica se o pagamento foi aprovado
    if (status && status.toLowerCase().includes("paid")) {
      console.log(`💾 Gravando usuário ativo: ${email}`);

      await admin.firestore().collection("usuarios").doc(email).set(
        {
          ativo: true,
          produto: "Pacote Completo",
          dataCompra: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log("✅ Documento criado/atualizado com sucesso!");
      return res.status(200).json({ success: true });
    }

    console.log("⚠️ Status diferente de 'paid' - sem gravação.", status);
    return res
      .status(200)
      .json({ success: false, motivo: "Pagamento não confirmado" });
  } catch (err) {
    console.error("❌ ERRO DETECTADO:", err.message);
    console.error(err.stack);
    return res.status(500).json({
      error: true,
      message: err.message,
      hint: "Verifique os logs no Vercel para detalhes",
    });
  }
}
