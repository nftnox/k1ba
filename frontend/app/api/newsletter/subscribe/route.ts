import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const formData = !body ? await request.formData().catch(() => null) : null;

    const email = body?.email || formData?.get("email");

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email je obavezan" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Nevažeći email" }, { status: 400 });
    }

    const res = await fetch(
      `${process.env.BACKEND_API_URL}/api/newsletter/subscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Pretplata nije uspjela" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Uspješno ste se pretplatili!" });
  } catch {
    return NextResponse.json({ error: "Greška servera" }, { status: 500 });
  }
}
