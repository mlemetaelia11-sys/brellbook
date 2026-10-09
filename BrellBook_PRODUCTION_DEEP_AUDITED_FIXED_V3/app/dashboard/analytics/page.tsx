'use client';
import Link from "next/link";
import {useEffect,useState} from 'react';
import {DashboardShell} from '@/components/DashboardShell';

export default function Analytics(){
  const [d,setD]=useState<any>();
  const [err,setErr]=useState('');
  useEffect(()=>{
    (async()=>{
      const b=await fetch('/api/me/business');
      const bx=await b.json();
      if(!bx.business){setErr('No business found.');return;}
      const r=await fetch('/api/analytics?businessId='+bx.business.id);
      const x=await r.json();
      if(!r.ok){setErr(x.error||'Unable to load analytics');return;}
      setD(x);
    })().catch(()=>setErr('Unable to load analytics'));
  },[]);
  return <DashboardShell title="Analytics"><div className="page-title"><div><h1>Analytics</h1><p className="muted">Last 30 days · real booking and revenue data.</p></div></div>{err?<div className="card feature"><h3>{err}</h3><Link className="btn btn-primary" href="/dashboard/subscription">Upgrade</Link></div>:!d?<div className="card feature">Loading…</div>:<><div className="grid3">{[['Revenue',`TSh ${Math.round(d.metrics.revenue).toLocaleString()}`],['Bookings',d.metrics.bookings],['Customers',d.metrics.customers],['Completed',d.metrics.completed],['Cancellations',d.metrics.cancelled],['Average booking',`TSh ${Math.round(d.metrics.averageBookingValue).toLocaleString()}`]].map(x=><div className="card metric" key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div><div className="card panel" style={{marginTop:16}}><h3>Best services</h3>{d.byService.map((x:any)=><div className="hours-row" key={x.serviceId}><strong>{x.name}</strong><span>{x.count} bookings</span><span>TSh {Math.round(x.revenue).toLocaleString()}</span></div>)}</div></>}</DashboardShell>;
}
