import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (session.user) redirect(session.user.role === "STAFF" ? "/dashboard" : "/private-room");
  const params = await searchParams;
  return (
    <main className="container" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <section className="card" style={{ width: "min(460px, 100%)" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ width: 54, height: 54, borderRadius: 18, background: "#38bdf8", color: "#04111f", display: "grid", placeItems: "center", fontWeight: 900, marginBottom: 14 }}>20X</div>
          <h1 style={{ margin: 0, fontSize: 34 }}>ROAS20X</h1>
          <p className="muted">Login internal ZANEVA. HPP tidak pernah tampil untuk staff.</p>
        </div>
        {params.error && <p className="badge-danger" style={{ marginBottom: 16 }}>Username atau password salah</p>}
        <form action="/api/auth/login" method="post" className="grid">
          <label>Username<input className="input" name="username" required autoFocus /></label>
          <label>Password<input className="input" name="password" type="password" required /></label>
          <button className="btn" type="submit">Masuk</button>
        </form>
        <p className="muted" style={{ fontSize: 12 }}>Demo seed: owner / manager / staff — password: password123</p>
      </section>
    </main>
  );
}
