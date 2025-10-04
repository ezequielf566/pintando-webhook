import admin from "firebase-admin";

export default async function handler(req, res) {
  try {
    // 🧾 Mostra tudo que o servidor recebeu (para debug)
    console.log("🧾 Corpo completo recebido:", JSON.stringify(req.body, null, 2));

    // ✅ Inicialização do Firebase
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.FIREBASE_DB_URL,
      });
      console.log("✅ Firebase inicializado!");
    }

    // 🚫 Rejeita qualquer método diferente de POST
    if (req.method !== "POST") {
      return res
        .status(200)
        .json({ message: "Método não permitido (GET test OK)" });
    }

    // 🧩 Normaliza os campos possíveis do webhook da Kiwify
    const data =
      req.body.data ||
      req.body.payload ||
      req.body.webhook ||
      req.body.event_data ||
      req.body.purchase ||
      req.body;

    // 🕵️‍♂️ Procura o e-mail em qualquer nível conhecido
    const email =
      data.email ||
      (data.client && data.client.email) ||
      (data.buyer && data.buyer.email) ||
      (data.customer && data.customer.email) ||
      (data.user && data.user.email) ||
      (data.order && data.order.email) ||
      (data.subscription && data.subscription.customer_email);

    // 💰 Status do pagamento
    const status =
      data.status ||
      data.payment_status ||
      data.event ||
      (req.body.event && req.body.event.toLowerCase());

    console.log("📦 Dados interpretados:", { email, status });

    if (!email) {
      console.warn("❌ Nenhum e-mail encontrado no payload recebido!");
      return res.status(400).json({
        error: true,
        message: "Nenhum e-mail encontrado no payload recebido!",
        body: req.body,
      });
    }

    // 💾 Se o pagamento estiver aprovado ou pago
    if (status && status.toLowerCase().includes("paid")) {
      await admin.firestore().collection("usuarios").doc(email).set(
        {
          ativo: true,
          produto: "Pacote Completo",
          dataCompra: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log(`✅ Usuário ${email} gravado/atualizado com sucesso!`);
      return res.status(200).json({ success: true });
    }

    console.log("⚠️ Pagamento ainda não confirmado:", status);
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
