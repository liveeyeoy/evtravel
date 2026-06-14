export async function onRequestPost({ request, env }: any) {
  const formData = await request.formData();

  const country = formData.get("country") || "";
  const name = formData.get("name") || "";
  const email = formData.get("email") || "";
  const message = formData.get("message") || "";
  const website = formData.get("website") || "";
  const token = formData.get("cf-turnstile-response");

  if (website) {
    return new Response("OK", { status: 200 });
  }

  if (!message || !token) {
    return new Response("Missing required fields", { status: 400 });
  }

  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token.toString(),
    }),
  });

  const result: any = await verify.json();

  if (!result.success) {
    return new Response("Turnstile failed", { status: 400 });
  }

  const body = `
Uusi EVTravel-palautte:

Maa: ${country}
Nimi: ${name}
Sähköposti: ${email}

Viesti:
${message}
`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EVTravel <onboarding@resend.dev>",
      to: env.FEEDBACK_TO_EMAIL,
      subject: `EVTravel palaute: ${country}`,
      text: body,
    }),
  });

  return Response.redirect("/fi/kiitos/", 303);
}
