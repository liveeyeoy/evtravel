export async function onRequestGet({ request }: any) {
  return Response.redirect(new URL("/fi/", request.url).toString(), 302);
}

export async function onRequestPost({ request, env }: any) {
  try {
    const formData = await request.formData();

    const country = String(formData.get("country") || "");
    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const message = String(formData.get("message") || "");
    const website = String(formData.get("website") || "");
    const token = formData.get("cf-turnstile-response");

    if (website) {
      return Response.redirect(new URL("/fi/kiitos/", request.url).toString(), 303);
    }

    if (!message || !token) {
      return new Response("Puuttuva viesti tai Turnstile-varmennus.", { status: 400 });
    }

    if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY || !env.FEEDBACK_TO_EMAIL) {
      return new Response("Server configuration missing.", { status: 500 });
    }

    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: String(token),
      }),
    });

    const result: any = await verify.json();

    if (!result.success) {
      return new Response("Turnstile failed.", { status: 400 });
    }

    const body = `
Uusi EVTravel-palaute:

Maa: ${country}
Nimi: ${name}
Sähköposti: ${email}

Viesti:
${message}
`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EVTravel <onboarding@resend.dev>",
        to: env.FEEDBACK_TO_EMAIL,
        subject: `EVTravel palaute: ${country || "tuntematon maa"}`,
        text: body,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      return new Response(`Email send failed: ${errorText}`, { status: 500 });
    }

    return Response.redirect(new URL("/fi/kiitos/", request.url).toString(), 303);
  } catch (error: any) {
    return new Response(`Function error: ${error?.message || "Unknown error"}`, { status: 500 });
  }
}
