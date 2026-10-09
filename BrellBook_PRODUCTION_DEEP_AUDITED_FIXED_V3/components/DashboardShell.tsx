'use client';
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Sidebar} from "@/components/Sidebar";

const mobileLinks=[
  ["/dashboard","Home","⌂"],
  ["/dashboard/bookings","Bookings","◷"],
  ["/dashboard/calendar","Calendar","▦"],
  ["/dashboard/customers","Customers","♙"],
  ["/dashboard/more","More","•••"],
];

export function DashboardShell({children,title}:{children:React.ReactNode,title:string}){
  const pathname=usePathname();
  return <div className="shell">
    <Sidebar/>
    <main className="main">
      <header className="topbar">
        <div><strong>{title}</strong><span className="topbar-sub">BrellBook workspace</span></div>
        <div className="top-actions"><Link href="/dashboard/bookings/new" className="btn btn-primary btn-sm">+ New booking</Link><Link href="/dashboard/profile" className="avatar-btn">U</Link></div>
      </header>
      <div className="content">{children}</div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileLinks.map(([href,label,icon])=>{
          const active=href==="/dashboard" ? pathname===href : pathname.startsWith(href);
          return <Link href={href} key={href} className={active?"active":""} aria-current={active?"page":undefined}>
            <span className="mobile-nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>
          </Link>;
        })}
      </nav>
    </main>
  </div>;
}
