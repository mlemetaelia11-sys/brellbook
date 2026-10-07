import Link from "next/link";
import {DashboardShell} from "@/components/DashboardShell";

const items=[
  ["/dashboard/services","Services","Manage your services, prices and durations.","◇"],
  ["/dashboard/staff","Staff","Manage staff, schedules and assignments.","♧"],
  ["/dashboard/reviews","Reviews","Read and manage customer reviews.","☆"],
  ["/dashboard/analytics","Analytics","Track bookings, customers and revenue.","↗"],
  ["/dashboard/reports","Reports","View and export business reports.","▤"],
  ["/dashboard/payments","Payments","View booking and subscription payments.","◉"],
  ["/dashboard/subscription","Subscription","Plan, billing status and upgrades.","◆"],
  ["/dashboard/settings","Settings","Business, booking and notification settings.","⚙"],
  ["/dashboard/profile","My Profile","Update your account details.","○"],
  ["/dashboard/support","Help & Support","Get help or contact BrellBook support.","?"],
];

export default function MorePage(){
 return <DashboardShell title="More">
   <div className="page-title"><div><h1>More</h1><p className="muted">Everything else for managing your BrellBook business.</p></div></div>
   <div className="more-grid">
    {items.map(([href,label,desc,icon])=><Link href={href} className="more-card" key={href}>
      <span className="more-icon">{icon}</span><span className="more-copy"><strong>{label}</strong><small>{desc}</small></span><span className="more-arrow">›</span>
    </Link>)}
   </div>
 </DashboardShell>;
}
