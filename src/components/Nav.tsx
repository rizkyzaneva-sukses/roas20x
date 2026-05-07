import Link from "next/link";
import { getSession } from "@/lib/session";

export async function Nav() {
  const session = await getSession();
  const user = session.user;
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#38bdf8", color: "#04111f", display: "grid", placeItems: "center", fontWeight: 900 }}>20X</div>
          <div><b>ROAS20X</b><div className="muted" style={{ fontSize: 12 }}>ZANEVA ads decision system</div></div>
        </Link>
        {user && (
          <nav className="tabs">
            <Link className="tab" href="/dashboard">Dashboard</Link>
            <Link className="tab" href="/input-harga-jual">Input Harga Jual</Link>
            {(user.role === "OWNER" || user.role === "MANAGER") && <Link className="tab" href="/private-room">Private Room</Link>}
            {(user.role === "OWNER" || user.role === "MANAGER") && <Link className="tab" href="/rekap">Rekap</Link>}
            <form action="/api/auth/logout" method="post"><button className="btn secondary" type="submit">Logout {user.nama}</button></form>
          </nav>
        )}
      </div>
    </header>
  );
}
