import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image, mediaType, type } = await req.json()

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const prompt = type === 'extrato'
      ? `Analise esta imagem de extrato bancário brasileiro. Extraia TODAS as transações visíveis.

Retorne APENAS um JSON array (sem markdown, sem explicação, sem \`\`\`). Cada item:
{"tipo":"entrada" ou "saida","descricao":"texto","valor":123.45,"data":"YYYY-MM-DD","categoria":"X"}

Categorias permitidas: Aluguel, Água, Luz, Internet, Telefone, Alimentação, Transporte, Saúde, Educação, Lazer, Salário, Freelance, Investimentos, Transferência, Compras, Streaming, Delivery, Combustível, Outros

Regras:
- valor SEMPRE positivo (número, não string)
- tipo "entrada" = depósito/crédito/recebimento/salário, "saida" = débito/pagamento/compra
- Se não conseguir ler a data exata, use a data mais próxima visível
- Se a imagem não contiver transações financeiras, retorne []`
      : `Analise esta imagem de fatura de cartão de crédito brasileiro. Extraia TODAS as compras visíveis.

Retorne APENAS um JSON array (sem markdown, sem explicação, sem \`\`\`). Cada item:
{"descricao":"texto","valorTotal":123.45,"parcelas":1,"valorParcela":123.45,"data":"YYYY-MM-DD","categoria":"X"}

Categorias permitidas: Alimentação, Eletrônicos, Eletrodomésticos, Vestuário, Viagem, Escritório, Equipamentos, Software, Assinatura, Saúde, Lazer, Compras, Delivery, Streaming, Combustível, Outros

Regras:
- valores SEMPRE positivos (números, não strings)
- parcelas: 1 se à vista
- Se a imagem não contiver compras de cartão, retorne []`

    const mType = mediaType || 'image/jpeg'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mType, data: image } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096
          }
        })
      }
    )

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}`, detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const result = await response.json()

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) {
      return new Response(JSON.stringify({ error: 'Resposta vazia da IA' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let items = []
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      items = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: 'Falha ao interpretar resposta da IA', raw: text }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
